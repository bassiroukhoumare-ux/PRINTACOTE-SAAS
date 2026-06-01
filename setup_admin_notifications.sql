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
CREATE OR REPLACE FUNCTION public.admin_get_notifications()
RETURNS SETOF public.admin_notifications AS $$
    SELECT * FROM public.admin_notifications ORDER BY created_at DESC LIMIT 60;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.admin_mark_notifications_read()
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.admin_notifications SET is_read = true WHERE is_read = false;
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.admin_clear_notifications()
RETURNS BOOLEAN AS $$
BEGIN
    DELETE FROM public.admin_notifications;
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
