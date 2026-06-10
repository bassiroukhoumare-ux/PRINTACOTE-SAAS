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

-- RLS sur les messages
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

-- Helper interne pour vérifier la session administrateur (non exposé en RPC)
CREATE OR REPLACE FUNCTION public.internal_verify_admin_session(p_token UUID)
RETURNS BOOLEAN AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.admin_sessions 
        WHERE token = p_token AND expires_at > now()
    ) THEN
        RAISE EXCEPTION 'Non autorisé';
    END IF;
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. RPC : Statistiques globales du site (contourne RLS)
CREATE OR REPLACE FUNCTION public.admin_get_global_stats(p_token UUID)
RETURNS JSONB AS $$
DECLARE
    v_total_printers INTEGER;
    v_total_services INTEGER := 0;
    v_total_portfolio INTEGER := 0;
    v_total_products INTEGER;
    v_total_views BIGINT;
    v_total_clicks BIGINT;
    v_total_site_views BIGINT := 0;
    v_total_visitors BIGINT := 0;
    v_total_news INTEGER := 0;
    r RECORD;
BEGIN
    -- Vérification de session
    PERFORM public.internal_verify_admin_session(p_token);

    SELECT COUNT(*), COALESCE(SUM(views), 0), COALESCE(SUM(clicks), 0)
    INTO v_total_printers, v_total_views, v_total_clicks
    FROM public.printers;

    -- Agréger le nombre de services et de réalisations stockés en JSONB
    FOR r IN SELECT services, portfolio FROM public.printers LOOP
        v_total_services := v_total_services + COALESCE(jsonb_array_length(r.services), 0);
        v_total_portfolio := v_total_portfolio + COALESCE(array_length(r.portfolio, 1), 0);
    END LOOP;

    SELECT COUNT(*)
    INTO v_total_products
    FROM public.products;

    -- Trafic réel du site (si la table existe déjà)
    IF to_regclass('public.site_views') IS NOT NULL THEN
        SELECT COUNT(*), COUNT(DISTINCT visitor_id)
        INTO v_total_site_views, v_total_visitors
        FROM public.site_views;
    END IF;

    -- Actualités publiées (si la table existe déjà)
    IF to_regclass('public.news') IS NOT NULL THEN
        SELECT COUNT(*) INTO v_total_news FROM public.news WHERE published = true;
    END IF;

    RETURN jsonb_build_object(
        'totalPrinters', v_total_printers,
        'totalServices', v_total_services,
        'totalPortfolio', v_total_portfolio,
        'totalProducts', v_total_products,
        'totalViews', v_total_views,
        'totalClicks', v_total_clicks,
        'totalSiteViews', v_total_site_views,
        'totalVisitors', v_total_visitors,
        'totalNews', v_total_news
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. RPC : Liste des imprimeurs avec e-mail du propriétaire (contourne RLS)
CREATE OR REPLACE FUNCTION public.admin_get_printers_list(p_token UUID)
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
    portfolio JSONB,
    trial_ends_at TIMESTAMPTZ,
    subscription_status TEXT,
    subscription_ends_at TIMESTAMPTZ,
    subscription_plan TEXT,
    badge TEXT
) AS $$
BEGIN
    -- Vérification de session
    PERFORM public.internal_verify_admin_session(p_token);

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
        u.email::text,            -- auth.users.email est varchar(255)
        p.services,
        to_jsonb(p.portfolio),    -- printers.portfolio est text[] -> jsonb pour le front
        p.trial_ends_at,
        p.subscription_status,
        p.subscription_ends_at,
        p.subscription_plan,
        p.badge
    FROM public.printers p
    LEFT JOIN auth.users u ON p.owner_id = u.id
    ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. RPC : Activer/Désactiver le statut d'une boutique (contourne RLS)
CREATE OR REPLACE FUNCTION public.admin_toggle_printer_status(p_token UUID, p_printer_id UUID, p_status TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    -- Vérification de session
    PERFORM public.internal_verify_admin_session(p_token);

    UPDATE public.printers
    SET status = p_status
    WHERE id = p_printer_id;
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. RPC : Supprimer un imprimeur (contourne RLS)
CREATE OR REPLACE FUNCTION public.admin_delete_printer(p_token UUID, p_printer_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Vérification de session
    PERFORM public.internal_verify_admin_session(p_token);

    DELETE FROM public.printers WHERE id = p_printer_id;
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. RPC : Modérer/Mettre à jour le portfolio d'un imprimeur (contourne RLS)
CREATE OR REPLACE FUNCTION public.admin_update_printer_portfolio(p_token UUID, p_printer_id UUID, p_portfolio JSONB)
RETURNS BOOLEAN AS $$
BEGIN
    -- Vérification de session
    PERFORM public.internal_verify_admin_session(p_token);

    -- printers.portfolio est text[] : on convertit le jsonb reçu du front en text[].
    UPDATE public.printers
    SET portfolio = CASE
        WHEN p_portfolio IS NULL OR jsonb_typeof(p_portfolio) <> 'array' THEN '{}'::text[]
        ELSE ARRAY(SELECT jsonb_array_elements_text(p_portfolio))
    END
    WHERE id = p_printer_id;
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. RPC : Modérer/Mettre à jour les services d'un imprimeur (contourne RLS)
CREATE OR REPLACE FUNCTION public.admin_update_printer_services(p_token UUID, p_printer_id UUID, p_services JSONB)
RETURNS BOOLEAN AS $$
BEGIN
    -- Vérification de session
    PERFORM public.internal_verify_admin_session(p_token);

    UPDATE public.printers
    SET services = p_services
    WHERE id = p_printer_id;
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. RPC : Supprimer un produit de la marketplace (contourne RLS)
CREATE OR REPLACE FUNCTION public.admin_delete_product(p_token UUID, p_product_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Vérification de session
    PERFORM public.internal_verify_admin_session(p_token);

    DELETE FROM public.products WHERE id = p_product_id;
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. RPC : Activer/Désactiver un produit de la marketplace (contourne RLS)
CREATE OR REPLACE FUNCTION public.admin_toggle_product_status(p_token UUID, p_product_id UUID, p_status TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    -- Vérification de session
    PERFORM public.internal_verify_admin_session(p_token);

    UPDATE public.products
    SET status = p_status
    WHERE id = p_product_id;
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. RPC : Récupérer tous les messages support avec nom de l'imprimeur (contourne RLS)
CREATE OR REPLACE FUNCTION public.admin_get_messages(p_token UUID)
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
    -- Vérification de session
    PERFORM public.internal_verify_admin_session(p_token);

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
CREATE OR REPLACE FUNCTION public.admin_send_message(p_token UUID, p_printer_id UUID, p_subject TEXT, p_content TEXT)
RETURNS UUID AS $$
DECLARE
    v_msg_id UUID;
BEGIN
    -- Vérification de session
    PERFORM public.internal_verify_admin_session(p_token);

    INSERT INTO public.admin_messages (printer_id, subject, content, direction, is_read)
    VALUES (p_printer_id, p_subject, p_content, 'admin_to_printer', false)
    RETURNING id INTO v_msg_id;
    
    RETURN v_msg_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. RPC : Envoyer un message groupé (bulk) à une sélection d'imprimeurs (contourne RLS)
CREATE OR REPLACE FUNCTION public.admin_send_message_bulk(p_token UUID, p_printer_ids UUID[], p_subject TEXT, p_content TEXT)
RETURNS INTEGER AS $$
DECLARE
    v_pid UUID;
    v_count INTEGER := 0;
BEGIN
    -- Vérification de session
    PERFORM public.internal_verify_admin_session(p_token);

    FOREACH v_pid IN ARRAY p_printer_ids LOOP
        INSERT INTO public.admin_messages (printer_id, subject, content, direction, is_read)
        VALUES (v_pid, p_subject, p_content, 'admin_to_printer', false);
        v_count := v_count + 1;
    END LOOP;
    
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 13. RPC : Marquer les messages d'un imprimeur comme lus (contourne RLS)
CREATE OR REPLACE FUNCTION public.admin_mark_messages_read(p_token UUID, p_printer_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Vérification de session
    PERFORM public.internal_verify_admin_session(p_token);

    UPDATE public.admin_messages
    SET is_read = true
    WHERE printer_id = p_printer_id AND direction = 'printer_to_admin' AND is_read = false;
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 14. RPC : Mettre à jour un produit de la marketplace (contourne RLS)
CREATE OR REPLACE FUNCTION public.admin_update_product(
    p_token UUID,
    p_product_id UUID, 
    p_name TEXT, 
    p_price NUMERIC, 
    p_promo_price NUMERIC, 
    p_discount NUMERIC, 
    p_description TEXT, 
    p_options JSONB
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Vérification de session
    PERFORM public.internal_verify_admin_session(p_token);

    UPDATE public.products
    SET 
        name = p_name,
        price = p_price,
        promo_price = p_promo_price,
        discount = p_discount,
        description = p_description,
        options = p_options
    WHERE id = p_product_id;
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 15. Table des paramètres système (pour la bannière de publicité)
CREATE TABLE IF NOT EXISTS public.system_settings (
    key          TEXT PRIMARY KEY,
    value        JSONB NOT NULL,
    updated_at   TIMESTAMPTZ DEFAULT now()
);

-- RLS sur system_settings
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read system settings" ON public.system_settings;
CREATE POLICY "Anyone can read system settings" ON public.system_settings
    FOR SELECT USING (true);

-- 16. RPC : Mettre à jour un paramètre système (contourne RLS)
CREATE OR REPLACE FUNCTION public.admin_set_setting(p_token UUID, p_key TEXT, p_value JSONB)
RETURNS BOOLEAN AS $$
BEGIN
    -- Vérification de session
    PERFORM public.internal_verify_admin_session(p_token);

    INSERT INTO public.system_settings (key, value, updated_at)
    VALUES (p_key, p_value, now())
    ON CONFLICT (key) DO UPDATE
    SET value = EXCLUDED.value,
        updated_at = now();
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 17. RPC : Mettre à jour le schéma de la base de données (contourne RLS)
CREATE OR REPLACE FUNCTION public.admin_run_schema_updates(p_token UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Vérification de session
    PERFORM public.internal_verify_admin_session(p_token);

    -- Ajouter la colonne created_at à la table products si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name='products' AND column_name='created_at'
    ) THEN
        ALTER TABLE public.products ADD COLUMN created_at TIMESTAMPTZ DEFAULT now();
    END IF;
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =====================================================================
-- Révocation explicite des droits d'exécution publique (anon/authenticated)
-- =====================================================================

REVOKE EXECUTE ON FUNCTION public.admin_get_global_stats(UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_get_printers_list(UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_toggle_printer_status(UUID, UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_delete_printer(UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_update_printer_portfolio(UUID, UUID, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_update_printer_services(UUID, UUID, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_delete_product(UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_toggle_product_status(UUID, UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_get_messages(UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_send_message(UUID, UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_send_message_bulk(UUID, UUID[], TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_mark_messages_read(UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_update_product(UUID, UUID, TEXT, NUMERIC, NUMERIC, NUMERIC, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_set_setting(UUID, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_run_schema_updates(UUID) FROM PUBLIC, anon, authenticated;
