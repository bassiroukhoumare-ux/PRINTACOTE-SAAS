-- =====================================================================
-- Printacote — Espace Administration (Tables & RPCs de Modération)
-- À exécuter dans l'éditeur SQL de Supabase.
-- =====================================================================

-- 1. Table de messagerie de support
CREATE TABLE IF NOT EXISTS public.admin_messages (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    printer_id  UUID REFERENCES public.printers(id) ON DELETE CASCADE NOT NULL,
    subject     TEXT NOT NULL,
    content     TEXT NOT NULL,
    is_read     BOOLEAN NOT NULL DEFAULT false,
    direction   TEXT NOT NULL CHECK (direction IN ('printer_to_admin', 'admin_to_printer'))
);

CREATE INDEX IF NOT EXISTS admin_messages_printer_idx ON public.admin_messages (printer_id);
CREATE INDEX IF NOT EXISTS admin_messages_created_idx ON public.admin_messages (created_at DESC);

-- 2. Sécurité RLS sur les messages
ALTER TABLE public.admin_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Printers can read their own support messages" ON public.admin_messages;
CREATE POLICY "Printers can read their own support messages" ON public.admin_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.printers 
            WHERE id = admin_messages.printer_id AND owner_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Printers can send support messages" ON public.admin_messages;
CREATE POLICY "Printers can send support messages" ON public.admin_messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.printers 
            WHERE id = admin_messages.printer_id AND owner_id = auth.uid()
        )
    );

-- 3. RPC : Statistiques globales du site (contourne RLS)
CREATE OR REPLACE FUNCTION public.admin_get_global_stats()
RETURNS JSONB AS $$
DECLARE
    v_total_printers INTEGER;
    v_total_services INTEGER := 0;
    v_total_portfolio INTEGER := 0;
    v_total_products INTEGER;
    v_total_views BIGINT;
    v_total_clicks BIGINT;
    r RECORD;
BEGIN
    SELECT COUNT(*), COALESCE(SUM(views), 0), COALESCE(SUM(clicks), 0)
    INTO v_total_printers, v_total_views, v_total_clicks
    FROM public.printers;

    -- Agréger le nombre de services et de réalisations stockés en JSONB
    FOR r IN SELECT services, portfolio FROM public.printers LOOP
        v_total_services := v_total_services + COALESCE(jsonb_array_length(r.services), 0);
        v_total_portfolio := v_total_portfolio + COALESCE(jsonb_array_length(r.portfolio), 0);
    END LOOP;

    SELECT COUNT(*)
    INTO v_total_products
    FROM public.products;

    RETURN jsonb_build_object(
        'totalPrinters', v_total_printers,
        'totalServices', v_total_services,
        'totalPortfolio', v_total_portfolio,
        'totalProducts', v_total_products,
        'totalViews', v_total_views,
        'totalClicks', v_total_clicks
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. RPC : Liste des imprimeurs avec e-mail du propriétaire (contourne RLS)
CREATE OR REPLACE FUNCTION public.admin_get_printers_list()
RETURNS TABLE (
    id UUID,
    created_at TIMESTAMPTZ,
    name TEXT,
    first_name TEXT,
    last_name TEXT,
    city TEXT,
    country TEXT,
    whatsapp TEXT,
    phone TEXT,
    status TEXT,
    views INTEGER,
    clicks INTEGER,
    logo_url TEXT,
    cover_url TEXT,
    rating NUMERIC,
    email TEXT,
    services JSONB,
    portfolio JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.created_at,
        p.name,
        p.first_name,
        p.last_name,
        p.city,
        p.country,
        p.whatsapp,
        p.phone,
        p.status,
        p.views,
        p.clicks,
        p.logo_url,
        p.cover_url,
        p.rating,
        u.email,
        p.services,
        p.portfolio
    FROM public.printers p
    LEFT JOIN auth.users u ON p.owner_id = u.id
    ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. RPC : Activer/Désactiver le statut d'une boutique (contourne RLS)
CREATE OR REPLACE FUNCTION public.admin_toggle_printer_status(p_printer_id UUID, p_status TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.printers
    SET status = p_status
    WHERE id = p_printer_id;
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. RPC : Supprimer un imprimeur (contourne RLS)
CREATE OR REPLACE FUNCTION public.admin_delete_printer(p_printer_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    DELETE FROM public.printers WHERE id = p_printer_id;
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. RPC : Modérer/Mettre à jour le portfolio d'un imprimeur (contourne RLS)
CREATE OR REPLACE FUNCTION public.admin_update_printer_portfolio(p_printer_id UUID, p_portfolio JSONB)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.printers
    SET portfolio = p_portfolio
    WHERE id = p_printer_id;
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. RPC : Modérer/Mettre à jour les services d'un imprimeur (contourne RLS)
CREATE OR REPLACE FUNCTION public.admin_update_printer_services(p_printer_id UUID, p_services JSONB)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.printers
    SET services = p_services
    WHERE id = p_printer_id;
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. RPC : Supprimer un produit de la marketplace (contourne RLS)
CREATE OR REPLACE FUNCTION public.admin_delete_product(p_product_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    DELETE FROM public.products WHERE id = p_product_id;
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. RPC : Récupérer tous les messages support avec nom de l'imprimeur (contourne RLS)
CREATE OR REPLACE FUNCTION public.admin_get_messages()
RETURNS TABLE (
    id UUID,
    created_at TIMESTAMPTZ,
    printer_id UUID,
    printer_name TEXT,
    printer_logo TEXT,
    subject TEXT,
    content TEXT,
    is_read BOOLEAN,
    direction TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.id,
        m.created_at,
        m.printer_id,
        p.name AS printer_name,
        p.logo_url AS printer_logo,
        m.subject,
        m.content,
        m.is_read,
        m.direction
    FROM public.admin_messages m
    LEFT JOIN public.printers p ON m.printer_id = p.id
    ORDER BY m.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. RPC : Envoyer un message depuis l'administration (support) (contourne RLS)
CREATE OR REPLACE FUNCTION public.admin_send_message(p_printer_id UUID, p_subject TEXT, p_content TEXT)
RETURNS UUID AS $$
DECLARE
    v_msg_id UUID;
BEGIN
    INSERT INTO public.admin_messages (printer_id, subject, content, direction, is_read)
    VALUES (p_printer_id, p_subject, p_content, 'admin_to_printer', false)
    RETURNING id INTO v_msg_id;
    
    RETURN v_msg_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. RPC : Envoyer un message groupé (bulk) à une sélection d'imprimeurs (contourne RLS)
CREATE OR REPLACE FUNCTION public.admin_send_message_bulk(p_printer_ids UUID[], p_subject TEXT, p_content TEXT)
RETURNS INTEGER AS $$
DECLARE
    v_pid UUID;
    v_count INTEGER := 0;
BEGIN
    FOREACH v_pid IN ARRAY p_printer_ids LOOP
        INSERT INTO public.admin_messages (printer_id, subject, content, direction, is_read)
        VALUES (v_pid, p_subject, p_content, 'admin_to_printer', false);
        v_count := v_count + 1;
    END LOOP;
    
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 13. RPC : Marquer les messages d'un imprimeur comme lus (contourne RLS)
CREATE OR REPLACE FUNCTION public.admin_mark_messages_read(p_printer_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.admin_messages
    SET is_read = true
    WHERE printer_id = p_printer_id AND direction = 'printer_to_admin' AND is_read = false;
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
