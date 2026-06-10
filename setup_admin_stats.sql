-- =====================================================================
-- Printacote — Statistiques réelles de l'admin
-- Trafic réel du site (site_views), actualités (news) et suspension
-- temporisée des produits de la marketplace.
-- À exécuter dans l'éditeur SQL de Supabase APRÈS setup_database.sql
-- et setup_admin.sql.
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ---------------------------------------------------------------------
-- 1. TRAFIC RÉEL DU SITE : table horodatée des vues de pages
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.site_views (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    path        TEXT,
    visitor_id  TEXT
);

CREATE INDEX IF NOT EXISTS site_views_created_idx ON public.site_views (created_at DESC);
CREATE INDEX IF NOT EXISTS site_views_visitor_idx ON public.site_views (visitor_id);

ALTER TABLE public.site_views ENABLE ROW LEVEL SECURITY;
-- Pas de policy d'INSERT publique : l'écriture passe par la RPC SECURITY DEFINER.

-- RPC : enregistrer une vue réelle (appelée par le frontend, rôle anon)
CREATE OR REPLACE FUNCTION public.record_site_view(p_path TEXT, p_visitor_id TEXT)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.site_views (path, visitor_id)
    VALUES (p_path, p_visitor_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.record_site_view(TEXT, TEXT) TO anon, authenticated;

-- RPC : série temporelle RÉELLE des vues du site selon la période.
-- p_period ∈ 'today' (24 dernières heures, par heure),
--            'week'  (7 derniers jours, par jour),
--            'month' (30 derniers jours, par jour),
--            'year'  (12 derniers mois, par mois).
-- Renvoie un tableau JSONB [{ "ts": <timestamptz du bucket>, "value": <nb réel> }],
-- zéros inclus (zero-filling via generate_series) pour un graphique lisible.
DROP FUNCTION IF EXISTS public.admin_get_views_timeseries(TEXT);
CREATE OR REPLACE FUNCTION public.admin_get_views_timeseries(p_token UUID, p_period TEXT)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    -- Vérification de session
    PERFORM public.internal_verify_admin_session(p_token);

    IF p_period = 'today' THEN
        SELECT jsonb_agg(jsonb_build_object('ts', g.bucket, 'value', COALESCE(c.cnt, 0)) ORDER BY g.bucket)
        INTO result
        FROM generate_series(date_trunc('hour', now()) - interval '23 hours',
                             date_trunc('hour', now()), interval '1 hour') AS g(bucket)
        LEFT JOIN (
            SELECT date_trunc('hour', created_at) AS h, count(*) AS cnt
            FROM public.site_views
            WHERE created_at >= now() - interval '24 hours'
            GROUP BY 1
        ) c ON c.h = g.bucket;

    ELSIF p_period = 'week' THEN
        SELECT jsonb_agg(jsonb_build_object('ts', g.bucket, 'value', COALESCE(c.cnt, 0)) ORDER BY g.bucket)
        INTO result
        FROM generate_series(date_trunc('day', now()) - interval '6 days',
                             date_trunc('day', now()), interval '1 day') AS g(bucket)
        LEFT JOIN (
            SELECT date_trunc('day', created_at) AS d, count(*) AS cnt
            FROM public.site_views
            WHERE created_at >= date_trunc('day', now()) - interval '6 days'
            GROUP BY 1
        ) c ON c.d = g.bucket;

    ELSIF p_period = 'month' THEN
        SELECT jsonb_agg(jsonb_build_object('ts', g.bucket, 'value', COALESCE(c.cnt, 0)) ORDER BY g.bucket)
        INTO result
        FROM generate_series(date_trunc('day', now()) - interval '29 days',
                             date_trunc('day', now()), interval '1 day') AS g(bucket)
        LEFT JOIN (
            SELECT date_trunc('day', created_at) AS d, count(*) AS cnt
            FROM public.site_views
            WHERE created_at >= date_trunc('day', now()) - interval '29 days'
            GROUP BY 1
        ) c ON c.d = g.bucket;

    ELSE -- 'year'
        SELECT jsonb_agg(jsonb_build_object('ts', g.bucket, 'value', COALESCE(c.cnt, 0)) ORDER BY g.bucket)
        INTO result
        FROM generate_series(date_trunc('month', now()) - interval '11 months',
                             date_trunc('month', now()), interval '1 month') AS g(bucket)
        LEFT JOIN (
            SELECT date_trunc('month', created_at) AS m, count(*) AS cnt
            FROM public.site_views
            WHERE created_at >= date_trunc('month', now()) - interval '11 months'
            GROUP BY 1
        ) c ON c.m = g.bucket;
    END IF;

    RETURN COALESCE(result, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------------------------------------------------------------------
-- 2. ACTUALITÉS : table réelle (remplace le tableau codé en dur du front)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.news (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    title       TEXT NOT NULL,
    excerpt     TEXT,
    content     TEXT,
    image_url   TEXT,
    read_time   TEXT,
    views       INTEGER NOT NULL DEFAULT 0,
    published   BOOLEAN NOT NULL DEFAULT true
);

ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read published news" ON public.news;
CREATE POLICY "Public read published news" ON public.news
    FOR SELECT USING (published = true);

-- Migration unique du contenu réel déjà présent sur le site (NewsPage.jsx).
-- N'insère que si la table est vide (idempotent, pas de doublon).
INSERT INTO public.news (title, excerpt, content, image_url, read_time, views, created_at)
SELECT v.title, v.excerpt, v.content, v.image_url, v.read_time, v.views, v.created_at
FROM (VALUES
    (
        'Comment choisir le bon papier pour vos impressions ?',
        'Le choix du support est crucial pour le rendu final de vos documents. Découvrez nos conseils d''experts.',
        E'Le choix du papier est l''un des aspects les plus critiques de tout projet d''impression. Il ne s''agit pas seulement d''esthétique, mais aussi de fonctionnalité et de perception de la marque. Dans cet article, nous explorons les différences entre le papier couché, le papier offset, et les papiers texturés.\n\nPourquoi le grammage est-il important ?\n\nLe grammage (exprimé en g/m²) détermine la rigidité et l''opacité du papier. Pour des cartes de visite, nous recommandons au moins 350g, tandis que pour des flyers standards, 135g à 170g suffisent largement.',
        'https://images.unsplash.com/photo-1589330694653-ded6df03f754?q=80&w=1000&auto=format&fit=crop',
        '5 min', 1200, '2024-05-14'::timestamptz
    ),
    (
        'L''impression 3D révolutionne l''artisanat local',
        'Une nouvelle ère s''ouvre pour les créateurs sénégalais avec l''arrivée de machines haute précision.',
        E'L''impression 3D n''est plus une technologie du futur ; elle est déjà là et transforme la façon dont les artisans sénégalais conçoivent leurs produits. Des bijoux aux pièces mécaniques, les possibilités sont infinies.\n\nLes avantages pour les PME :\n\n- Réduction des coûts de prototypage.\n- Personnalisation extrême des produits.\n- Rapidité de mise sur le marché.',
        'https://images.unsplash.com/photo-1631034300185-da943f9a74a4?q=80&w=1000&auto=format&fit=crop',
        '8 min', 856, '2024-05-12'::timestamptz
    ),
    (
        'Tendance : Le retour du Letterpress',
        'Pourquoi cette technique ancienne redevient le summum du luxe pour les cartes de visite.',
        'Le Letterpress, ou impression typographique, est une technique ancestrale qui consiste à presser les caractères sur le papier, créant un relief palpable. C''est aujourd''hui le choix privilégié pour les marques de luxe cherchant une distinction tactile.',
        'https://images.unsplash.com/photo-1563986768609-322da13575f3?q=80&w=1000&auto=format&fit=crop',
        '6 min', 2400, '2024-05-10'::timestamptz
    )
) AS v(title, excerpt, content, image_url, read_time, views, created_at)
WHERE NOT EXISTS (SELECT 1 FROM public.news);

-- ---------------------------------------------------------------------
-- 3. SUSPENSION TEMPORISÉE DES PRODUITS DE LA MARKETPLACE
-- ---------------------------------------------------------------------
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS suspended_until TIMESTAMPTZ;

-- RPC : suspendre un produit jusqu'à une date donnée (statut 'Suspendu').
-- Le marketplace public filtre status = 'En ligne' → le produit devient
-- réellement invisible côté site sans être supprimé.
DROP FUNCTION IF EXISTS public.admin_suspend_product(UUID, TIMESTAMPTZ);
CREATE OR REPLACE FUNCTION public.admin_suspend_product(p_token UUID, p_product_id UUID, p_until TIMESTAMPTZ)
RETURNS BOOLEAN AS $$
BEGIN
    -- Vérification de session
    PERFORM public.internal_verify_admin_session(p_token);

    UPDATE public.products
    SET status = 'Suspendu',
        suspended_until = p_until
    WHERE id = p_product_id;
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC : réactivation automatique des produits dont la suspension a expiré.
-- Appelée paresseusement au chargement de l'admin et du marketplace public,
-- et utilisable via pg_cron. Renvoie le nombre de produits réactivés.
CREATE OR REPLACE FUNCTION public.reactivate_expired_products()
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE public.products
    SET status = 'En ligne',
        suspended_until = NULL
    WHERE status = 'Suspendu'
      AND suspended_until IS NOT NULL
      AND suspended_until <= now();
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.reactivate_expired_products() TO anon, authenticated;

-- ---------------------------------------------------------------------
-- 4. STATISTIQUES GLOBALES — version étendue (trafic réel + actualités)
--    Remplace admin_get_global_stats de setup_admin.sql en y ajoutant :
--    totalSiteViews, totalVisitors (distincts), totalNews.
-- ---------------------------------------------------------------------
-- Suppression de la version non sécurisée de statistiques globales si elle existe
DROP FUNCTION IF EXISTS public.admin_get_global_stats();

-- Révocation explicite des droits d'exécution publique
REVOKE EXECUTE ON FUNCTION public.admin_get_views_timeseries(UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_suspend_product(UUID, UUID, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
