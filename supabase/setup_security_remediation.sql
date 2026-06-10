-- =====================================================================
-- Printacote — Script de Remédiation de Sécurité & Migration
-- À exécuter dans l'éditeur SQL de Supabase.
-- =====================================================================

-- 1. Table des configurations privées/sécurisées
CREATE TABLE IF NOT EXISTS public.secure_configs (
    key          TEXT PRIMARY KEY,
    value        TEXT NOT NULL,
    updated_at   TIMESTAMPTZ DEFAULT now()
);

-- Activation de RLS sur secure_configs (aucune politique SELECT publique -> inaccessible)
ALTER TABLE public.secure_configs ENABLE ROW LEVEL SECURITY;

-- Insertion des valeurs par défaut sécurisées
INSERT INTO public.secure_configs (key, value)
VALUES 
    ('resend_api_key', 'REMPLACER_PAR_VOTRE_CLE_API_RESEND'),
    ('admin_password', 'REMPLACER_PAR_VOTRE_MOT_DE_PASSE_ADMIN')
ON CONFLICT (key) DO NOTHING;

-- 2. Table des sessions d'administration
CREATE TABLE IF NOT EXISTS public.admin_sessions (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token       UUID UNIQUE NOT NULL DEFAULT uuid_generate_v4(),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at  TIMESTAMPTZ NOT NULL
);

-- Activation de RLS sur admin_sessions (aucune politique SELECT publique -> inaccessible)
ALTER TABLE public.admin_sessions ENABLE ROW LEVEL SECURITY;

-- Index pour accélérer la vérification de l'expiration
CREATE INDEX IF NOT EXISTS admin_sessions_token_expires_idx ON public.admin_sessions (token, expires_at);

-- 3. RPC : Vérifier le mot de passe admin et générer un jeton de session
CREATE OR REPLACE FUNCTION public.admin_verify_password(p_password TEXT)
RETURNS UUID AS $$
DECLARE
    v_correct_password TEXT;
    v_session_token UUID;
BEGIN
    -- Récupérer le mot de passe depuis secure_configs
    SELECT value INTO v_correct_password FROM public.secure_configs WHERE key = 'admin_password';
    IF v_correct_password IS NULL THEN
        v_correct_password := NULL;
    END IF;

    IF p_password = v_correct_password THEN
        -- Générer un nouveau jeton de session valide pendant 2 heures
        INSERT INTO public.admin_sessions (expires_at)
        VALUES (now() + interval '2 hours')
        RETURNING token INTO v_session_token;
        
        RETURN v_session_token;
    ELSE
        RETURN NULL;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. RPC : Envoyer des e-mails administratifs et de modération de manière sécurisée (contourne RLS pour Resend)
CREATE OR REPLACE FUNCTION public.send_deletion_email(
    p_printer_id UUID, 
    p_type TEXT, 
    p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_email TEXT;
  v_printer_name TEXT;
  v_first_name TEXT;
  v_last_name TEXT;
  v_city TEXT;
  v_country TEXT;
  v_phone TEXT;
  v_resend_api_key TEXT;
  v_sender_email TEXT := 'Printacoté <onboarding@resend.dev>'; 
  v_admin_email TEXT := 'bskdezigner@gmail.com';
  v_email_body TEXT;
  v_subject TEXT;
  v_to_email TEXT;
  v_formatted_date TEXT;
BEGIN
  -- Vérification d'autorisation : le demandeur doit posséder ce profil d'imprimeur
  -- ou être un administrateur authentifié (par exemple via les claims, ou ici simple validation d'appartenance)
  IF NOT EXISTS (
      SELECT 1 FROM public.printers 
      WHERE id = p_printer_id AND owner_id = auth.uid()
  ) THEN
      RAISE EXCEPTION 'Non autorisé à déclencher des notifications pour cette imprimerie.';
  END IF;

  -- Charger la clé Resend depuis secure_configs
  SELECT value INTO v_resend_api_key FROM public.secure_configs WHERE key = 'resend_api_key';
    IF v_resend_api_key IS NULL THEN
      RAISE EXCEPTION 'Clé API Resend manquante dans secure_configs.';
    END IF;

  -- Charger les informations de l'imprimeur
  SELECT p.name, p.first_name, p.last_name, p.city, p.country, p.phone, u.email
  INTO v_printer_name, v_first_name, v_last_name, v_city, v_country, v_phone, v_email
  FROM public.printers p
  JOIN auth.users u ON p.owner_id = u.id
  WHERE p.id = p_printer_id;

  IF v_email IS NULL THEN
    RETURN FALSE;
  END IF;

  v_formatted_date := to_char(now() + interval '24 hours', 'DD/MM/YYYY HH24:MI:SS');

  -- Configurer l'e-mail selon le type demandé
  IF p_type = 'schedule_printer' THEN
    v_to_email := v_email;
    v_subject := 'Confirmation de planification de suppression de compte';
    v_email_body := '
      <div style="font-family: sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 8px;">
          <h2 style="color: #ea580c;">Suppression de compte planifiée</h2>
          <p>Bonjour ' || COALESCE(v_printer_name, 'Imprimeur') || ',</p>
          <p>Nous vous informons que la suppression de votre compte Printacoté a été planifiée suite à votre demande.</p>
          <p>Votre vitrine publique a été <strong>désactivée immédiatement</strong> et n''est plus visible par le public.</p>
          <div style="background-color: #fef2f2; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #fee2e2;">
              <p style="margin: 0; color: #991b1b; font-weight: bold;">
                  La suppression définitive de toutes vos données aura lieu le : ' || v_formatted_date || ' (dans 24 heures).
              </p>
          </div>
          <p><strong>Vous avez changé d''avis ?</strong></p>
          <p>Vous pouvez annuler cette procédure à tout moment durant les prochaines 24 heures en vous connectant simplement à votre tableau de bord et en cliquant sur le bouton "Annuler la suppression".</p>
          <p>Si vous n''intervenez pas, votre compte et l''ensemble de ses données seront définitivement et irréversiblement effacés.</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 12px; color: #666; text-align: center;">Printacoté - Le réseau des imprimeurs locaux</p>
      </div>';
      
  ELSIF p_type = 'schedule_admin' THEN
    v_to_email := v_admin_email;
    v_subject := 'Alerte Suppression Compte : ' || v_printer_name;
    v_email_body := '
      <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #991b1b;">Notification Administrateur : Demande de suppression de compte</h2>
          <p>L''imprimerie <strong>' || COALESCE(v_printer_name, '') || '</strong> a planifié la suppression de son compte.</p>
          <p><strong>Détails du compte :</strong></p>
          <ul>
              <li><strong>ID :</strong> ' || p_printer_id || '</li>
              <li><strong>Email de contact :</strong> ' || v_email || '</li>
              <li><strong>Ville / Pays :</strong> ' || COALESCE(v_city, '-') || ' / ' || COALESCE(v_country, 'Sénégal') || '</li>
              <li><strong>Téléphone :</strong> ' || COALESCE(v_phone, '-') || '</li>
          </ul>
          <p><strong>Raison invoquée :</strong></p>
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; font-style: italic;">
              ' || COALESCE(p_reason, 'Aucune raison spécifiée.') || '
          </div>
          <p>La suppression est planifiée au : <strong>' || v_formatted_date || '</strong>.</p>
      </div>';

  ELSIF p_type = 'cancel_admin' THEN
    v_to_email := v_admin_email;
    v_subject := 'Réactivation de compte : ' || v_printer_name;
    v_email_body := '
      <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h2>Réactivation de compte Imprimeur</h2>
          <p>L''imprimerie <strong>' || COALESCE(v_printer_name, '') || '</strong> a annulé sa demande de suppression de compte et réactivé ses services.</p>
          <ul>
              <li><strong>ID :</strong> ' || p_printer_id || '</li>
              <li><strong>Email de contact :</strong> ' || v_email || '</li>
              <li><strong>Ville :</strong> ' || COALESCE(v_city, '-') || '</li>
              <li><strong>Téléphone :</strong> ' || COALESCE(v_phone, '-') || '</li>
          </ul>
      </div>';
  ELSE
    RETURN FALSE;
  END IF;

  -- Appel de l'API Resend via pg_net
  PERFORM net.http_post(
    url := 'https://api.resend.com/emails',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_resend_api_key
    ),
    body := jsonb_build_object(
      'from', v_sender_email,
      'to', v_to_email,
      'subject', v_subject,
      'html', v_email_body
    )
  );

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Restriction des droits d'exécution sur les fonctions sensibles
REVOKE EXECUTE ON FUNCTION public.send_deletion_email(UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.send_deletion_email(UUID, TEXT, TEXT) TO authenticated;

-- 5. MIGRATION DES COMPTES EXISTANTS : Application de la période d'essai de 14 jours
-- Applique un essai gratuit aux profils existants créés avant l'introduction de cette règle (sans trial_ends_at)
UPDATE public.printers
SET trial_ends_at = now() + interval '14 days',
    subscription_status = 'trial'
WHERE trial_ends_at IS NULL;
