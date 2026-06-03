-- =====================================================================
-- Printacote — Badges de profil des imprimeurs
-- (Pro / Vérifié / Pionnier / Pionnière), gérés depuis la console admin
-- et affichés sur le site public.
-- À exécuter dans l'éditeur SQL de Supabase.
-- =====================================================================

-- 1. Colonne badge (publique en lecture via la RLS existante des printers).
ALTER TABLE public.printers ADD COLUMN IF NOT EXISTS badge TEXT;

-- 2. RPC admin : attribuer / retirer un badge (contourne la RLS).
CREATE OR REPLACE FUNCTION public.admin_set_printer_badge(p_printer_id UUID, p_badge TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.printers
    SET badge = NULLIF(p_badge, '')
    WHERE id = p_printer_id;
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. La liste admin renvoie aussi le badge.
-- (DROP nécessaire car on ajoute une colonne au type de retour.)
DROP FUNCTION IF EXISTS public.admin_get_printers_list();
CREATE OR REPLACE FUNCTION public.admin_get_printers_list()
RETURNS TABLE (
    id UUID, created_at TIMESTAMPTZ, name TEXT, first_name TEXT, last_name TEXT,
    city TEXT, country TEXT, whatsapp TEXT, phone TEXT, status TEXT,
    views INTEGER, clicks INTEGER, logo_url TEXT, cover_url TEXT, rating NUMERIC,
    email TEXT, services JSONB, portfolio JSONB, badge TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id, p.created_at, p.name, p.first_name, p.last_name, p.city, p.country,
        p.whatsapp, p.phone, p.status, p.views, p.clicks, p.logo_url, p.cover_url,
        p.rating, u.email::text, p.services, to_jsonb(p.portfolio), p.badge
    FROM public.printers p
    LEFT JOIN auth.users u ON p.owner_id = u.id
    ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
