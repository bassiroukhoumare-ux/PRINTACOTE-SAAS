-- =====================================================================
-- Printacote — Réinitialisation de toutes les statistiques et vues à 0
-- =====================================================================
-- À exécuter dans l'éditeur SQL de Supabase.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.admin_reset_all_statistics()
RETURNS BOOLEAN AS $$
BEGIN
    -- 1. Réinitialise les vues et clics de tous les profils d'imprimeurs à 0
    UPDATE public.printers
    SET views = 0,
        clicks = 0;

    -- 2. Supprime l'historique de trafic réel du site (site_views)
    -- On utilise DELETE ou TRUNCATE selon les contraintes de clés étrangères (site_views n'en a pas)
    DELETE FROM public.site_views;

    -- 3. Supprime l'historique des clics WhatsApp et vues par imprimeur (printer_events)
    DELETE FROM public.printer_events;

    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
