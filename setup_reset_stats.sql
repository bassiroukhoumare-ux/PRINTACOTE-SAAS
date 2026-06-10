-- =====================================================================
-- Printacote — Réinitialisation de toutes les statistiques et vues à 0
-- =====================================================================
-- À exécuter dans l'éditeur SQL de Supabase.
-- =====================================================================

DROP FUNCTION IF EXISTS public.admin_reset_all_statistics();
CREATE OR REPLACE FUNCTION public.admin_reset_all_statistics(p_token UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Vérification de session
    PERFORM public.internal_verify_admin_session(p_token);

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

-- Révocation explicite des droits d'exécution publique
REVOKE EXECUTE ON FUNCTION public.admin_reset_all_statistics(UUID) FROM PUBLIC, anon, authenticated;
