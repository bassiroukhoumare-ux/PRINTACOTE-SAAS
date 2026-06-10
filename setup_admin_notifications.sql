-- =====================================================================
-- Printacote — Notifications admin automatiques
-- Crée une notification à chaque : nouveau produit, nouveau compte imprimeur,
-- nouvelle image ajoutée au portfolio. Alimenté par des triggers DB.
-- À exécuter dans l'éditeur SQL de Supabase.
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.admin_notifications (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type        TEXT NOT NULL,            -- 'product' | 'account' | 'portfolio'
    message     TEXT NOT NULL,
    ref_id      UUID,
    is_read     BOOLEAN NOT NULL DEFAULT false,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS admin_notifications_created_idx ON public.admin_notifications (created_at DESC);

ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;
-- Aucune policy publique : tout passe par les RPC SECURITY DEFINER.

-- ── Triggers ──────────────────────────────────────────────────────────
-- Nouveau produit
CREATE OR REPLACE FUNCTION public.notify_new_product()
RETURNS TRIGGER AS $$
DECLARE pname TEXT;
BEGIN
    SELECT name INTO pname FROM public.printers WHERE id = NEW.printer_id;
    INSERT INTO public.admin_notifications (type, message, ref_id)
    VALUES ('product', 'Nouveau produit « ' || COALESCE(NEW.name, 'Sans nom') || ' »' || COALESCE(' — ' || pname, ''), NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
DROP TRIGGER IF EXISTS trg_notify_new_product ON public.products;
CREATE TRIGGER trg_notify_new_product AFTER INSERT ON public.products
    FOR EACH ROW EXECUTE FUNCTION public.notify_new_product();

-- Nouveau compte imprimeur
CREATE OR REPLACE FUNCTION public.notify_new_printer()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.admin_notifications (type, message, ref_id)
    VALUES ('account', 'Nouveau compte imprimeur : ' || COALESCE(NEW.name, 'Sans nom'), NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
DROP TRIGGER IF EXISTS trg_notify_new_printer ON public.printers;
CREATE TRIGGER trg_notify_new_printer AFTER INSERT ON public.printers
    FOR EACH ROW EXECUTE FUNCTION public.notify_new_printer();

-- Nouvelle image ajoutée au portfolio (portfolio est un text[])
CREATE OR REPLACE FUNCTION public.notify_new_portfolio()
RETURNS TRIGGER AS $$
BEGIN
    IF COALESCE(array_length(NEW.portfolio, 1), 0) > COALESCE(array_length(OLD.portfolio, 1), 0) THEN
        INSERT INTO public.admin_notifications (type, message, ref_id)
        VALUES ('portfolio', 'Nouvelle réalisation portfolio — ' || COALESCE(NEW.name, 'Sans nom'), NEW.id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
DROP TRIGGER IF EXISTS trg_notify_new_portfolio ON public.printers;
CREATE TRIGGER trg_notify_new_portfolio AFTER UPDATE OF portfolio ON public.printers
    FOR EACH ROW EXECUTE FUNCTION public.notify_new_portfolio();

-- ── RPC admin ─────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.admin_get_notifications();
CREATE OR REPLACE FUNCTION public.admin_get_notifications(p_token UUID)
RETURNS SETOF public.admin_notifications AS $$
BEGIN
    PERFORM public.internal_verify_admin_session(p_token);
    RETURN QUERY SELECT * FROM public.admin_notifications ORDER BY created_at DESC LIMIT 60;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP FUNCTION IF EXISTS public.admin_mark_notifications_read();
CREATE OR REPLACE FUNCTION public.admin_mark_notifications_read(p_token UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Vérification de session
    PERFORM public.internal_verify_admin_session(p_token);

    UPDATE public.admin_notifications SET is_read = true WHERE is_read = false;
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP FUNCTION IF EXISTS public.admin_clear_notifications();
CREATE OR REPLACE FUNCTION public.admin_clear_notifications(p_token UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Vérification de session
    PERFORM public.internal_verify_admin_session(p_token);

    DELETE FROM public.admin_notifications;
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Révocation explicite des droits d'exécution publique
REVOKE EXECUTE ON FUNCTION public.admin_get_notifications(UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_mark_notifications_read(UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_clear_notifications(UUID) FROM PUBLIC, anon, authenticated;
