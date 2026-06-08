-- =====================================================================
-- Printacote — Abonnements (essai 14 jours + formules prépayées Moneroo)
-- À exécuter dans l'éditeur SQL de Supabase APRÈS setup_database.sql.
--
-- Modèle : Moneroo ne gère pas le prélèvement récurrent. On vend un
-- accès PRÉPAYÉ de 1 / 3 / 6 mois via un paiement unique. À l'inscription,
-- l'imprimeur bénéficie de 14 jours d'essai gratuit. Le webhook Moneroo
-- prolonge l'abonnement à la confirmation du paiement.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Colonnes d'abonnement sur la table printers
-- ---------------------------------------------------------------------
ALTER TABLE printers ADD COLUMN IF NOT EXISTS trial_ends_at        TIMESTAMPTZ;
ALTER TABLE printers ADD COLUMN IF NOT EXISTS subscription_status  TEXT DEFAULT 'trial';   -- 'trial' | 'active' | 'expired'
ALTER TABLE printers ADD COLUMN IF NOT EXISTS subscription_ends_at TIMESTAMPTZ;
ALTER TABLE printers ADD COLUMN IF NOT EXISTS subscription_plan    TEXT;                   -- '1m' | '3m' | '6m'

-- Backfill : on offre 14 jours d'essai à partir de maintenant aux comptes
-- existants (évite de les bloquer dès la mise en ligne du module).
UPDATE printers
SET trial_ends_at = now() + interval '14 days',
    subscription_status = 'trial'
WHERE trial_ends_at IS NULL;

-- ---------------------------------------------------------------------
-- 2. Trigger d'inscription : démarrer l'essai de 14 jours
--    (réécriture de handle_new_user pour ajouter trial_ends_at)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.printers (
    owner_id, name, city, country, whatsapp,
    first_name, last_name, logo_url, cover_url, rating, views, status,
    trial_ends_at, subscription_status
  ) VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'business_name', 'Mon Imprimerie'),
    COALESCE(new.raw_user_meta_data->>'city', ''),
    COALESCE(new.raw_user_meta_data->>'country', 'Sénégal'),
    COALESCE(new.raw_user_meta_data->>'whatsapp', ''),
    COALESCE(new.raw_user_meta_data->>'first_name', ''),
    COALESCE(new.raw_user_meta_data->>'last_name', ''),
    'https://ui-avatars.com/api/?name=' || replace(COALESCE(new.raw_user_meta_data->>'business_name', 'Mon Imprimerie'), ' ', '+') || '&background=random',
    'https://images.unsplash.com/photo-1562664347-4950157077a9?q=80&w=2500&auto=format&fit=crop',
    5.0,
    0,
    'Désactivé',
    now() + interval '14 days',   -- 14 jours d'essai gratuit
    'trial'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------------------------------------------------------------------
-- 3. Table des paiements d'abonnement
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS subscription_payments (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    printer_id              UUID REFERENCES printers(id) ON DELETE CASCADE,
    owner_id                UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    plan                    TEXT NOT NULL,                       -- '1m' | '3m' | '6m'
    months                  INTEGER NOT NULL,
    amount                  INTEGER NOT NULL,                    -- francs XOF entiers
    currency                TEXT NOT NULL DEFAULT 'XOF',
    status                  TEXT NOT NULL DEFAULT 'pending',     -- pending | completed | failed
    provider                TEXT NOT NULL DEFAULT 'moneroo',
    provider_transaction_id TEXT,
    checkout_url            TEXT,
    failure_reason          TEXT,
    webhook_received_at     TIMESTAMPTZ,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS subscription_payments_owner_idx ON subscription_payments (owner_id);
CREATE INDEX IF NOT EXISTS subscription_payments_tx_idx    ON subscription_payments (provider_transaction_id);

ALTER TABLE subscription_payments ENABLE ROW LEVEL SECURITY;

-- L'imprimeur peut lire son propre historique de paiements.
-- Les écritures sont faites par les Edge Functions via la service_role key
-- (qui contourne la RLS) — aucune policy d'insert/update n'est exposée au client.
DROP POLICY IF EXISTS "Owners read their payments" ON subscription_payments;
CREATE POLICY "Owners read their payments" ON subscription_payments
    FOR SELECT USING (auth.uid() = owner_id);

-- ---------------------------------------------------------------------
-- 4. Dédup des webhooks (TTL 24h, nettoyage via cron facultatif)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS processed_events (
    provider     TEXT NOT NULL,
    event_id     TEXT NOT NULL,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (provider, event_id)
);

ALTER TABLE processed_events ENABLE ROW LEVEL SECURITY;  -- accès service_role uniquement

-- ---------------------------------------------------------------------
-- 5. Activation idempotente d'un paiement (appelée par le webhook)
--    Passe le paiement à 'completed' UNIQUEMENT s'il était 'pending'
--    (garde-fou anti-rejeu), puis prolonge l'abonnement.
--    Renvoie TRUE si le paiement vient d'être appliqué, FALSE sinon.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.complete_subscription_payment(
    p_payment_id UUID,
    p_tx_id      TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    v_payment subscription_payments%ROWTYPE;
    v_base    TIMESTAMPTZ;
BEGIN
    UPDATE subscription_payments
    SET status = 'completed',
        provider_transaction_id = COALESCE(p_tx_id, provider_transaction_id),
        webhook_received_at = now(),
        updated_at = now()
    WHERE id = p_payment_id AND status = 'pending'
    RETURNING * INTO v_payment;

    IF NOT FOUND THEN
        RETURN FALSE;  -- déjà traité, ou paiement inconnu
    END IF;

    -- On prolonge à partir de la date d'expiration existante si elle est
    -- dans le futur (cumul), sinon à partir de maintenant.
    SELECT GREATEST(COALESCE(subscription_ends_at, now()), now())
    INTO v_base
    FROM printers WHERE id = v_payment.printer_id;

    UPDATE printers
    SET subscription_status = 'active',
        subscription_plan    = v_payment.plan,
        subscription_ends_at = v_base + make_interval(months => v_payment.months),
        status               = 'En ligne'
    WHERE id = v_payment.printer_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------------------------------------------------------------------
-- 6. Expiration des abonnements échus (masque le profil public)
--    Bascule en 'expired' + status 'Désactivé' les imprimeurs dont
--    l'essai ET l'abonnement sont terminés.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.expire_overdue_subscriptions()
RETURNS VOID AS $$
BEGIN
    UPDATE printers
    SET subscription_status = 'expired',
        status = 'Désactivé'
    WHERE subscription_status <> 'expired'
      AND COALESCE(trial_ends_at, '-infinity'::timestamptz) < now()
      AND COALESCE(subscription_ends_at, '-infinity'::timestamptz) < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Planification quotidienne (nécessite l'extension pg_cron, à activer
-- dans Database > Extensions du dashboard Supabase). Décommentez :
--
-- SELECT cron.schedule(
--   'expire-subscriptions',
--   '0 * * * *',                          -- toutes les heures
--   $$ SELECT public.expire_overdue_subscriptions();
--      DELETE FROM processed_events WHERE processed_at < now() - interval '24 hours'; $$
-- );
