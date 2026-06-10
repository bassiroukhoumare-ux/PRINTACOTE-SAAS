-- =====================================================================
-- Printacote — Badges de profil des imprimeurs
-- (Pro / Vérifié / Pionnier / Pionnière), gérés depuis la console admin
-- et affichés sur le site public.
-- À exécuter dans l'éditeur SQL de Supabase.
-- =====================================================================

-- 1. Colonne badge (publique en lecture via la RLS existante des printers).
ALTER TABLE public.printers ADD COLUMN IF NOT EXISTS badge TEXT;

-- 2. RPC admin : attribuer / retirer un badge (contourne la RLS).
DROP FUNCTION IF EXISTS public.admin_set_printer_badge(UUID, TEXT);
CREATE OR REPLACE FUNCTION public.admin_set_printer_badge(p_token UUID, p_printer_id UUID, p_badge TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    -- Vérification de session
    PERFORM public.internal_verify_admin_session(p_token);

    UPDATE public.printers
    SET badge = NULLIF(p_badge, '')
    WHERE id = p_printer_id;
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Suppression de la version non sécurisée de la liste d'imprimeurs si elle existe
DROP FUNCTION IF EXISTS public.admin_get_printers_list();

-- Révocation explicite des droits d'exécution publique
REVOKE EXECUTE ON FUNCTION public.admin_set_printer_badge(UUID, UUID, TEXT) FROM PUBLIC, anon, authenticated;
