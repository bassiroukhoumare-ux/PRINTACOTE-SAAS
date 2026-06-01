-- =====================================================================
-- Printacote — Analytics RÉELLES par imprimeur
-- Enregistre chaque vue de profil et chaque clic WhatsApp avec horodatage,
-- pour alimenter le dashboard imprimeur avec de vraies données (fini les
-- valeurs fabriquées).
-- À exécuter dans l'éditeur SQL de Supabase.
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Table d'événements horodatés par imprimeur
CREATE TABLE IF NOT EXISTS public.printer_events (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    printer_id  UUID REFERENCES public.printers(id) ON DELETE CASCADE NOT NULL,
    type        TEXT NOT NULL CHECK (type IN ('view', 'whatsapp_click')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    visitor_id  TEXT
);

CREATE INDEX IF NOT EXISTS printer_events_pid_idx ON public.printer_events (printer_id, type, created_at DESC);

ALTER TABLE public.printer_events ENABLE ROW LEVEL SECURITY;

-- L'imprimeur propriétaire peut lire ses propres événements.
DROP POLICY IF EXISTS "Owners read their printer events" ON public.printer_events;
CREATE POLICY "Owners read their printer events" ON public.printer_events
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.printers WHERE id = printer_events.printer_id AND owner_id = auth.uid())
    );
-- Pas de policy d'INSERT publique : l'écriture passe par les RPC SECURITY DEFINER.

-- 2. Les compteurs existants enregistrent AUSSI un événement horodaté.
CREATE OR REPLACE FUNCTION public.increment_printer_views(printer_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.printers SET views = COALESCE(views, 0) + 1 WHERE id = printer_id;
    INSERT INTO public.printer_events (printer_id, type) VALUES (printer_id, 'view');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.increment_printer_clicks(printer_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.printers SET clicks = COALESCE(clicks, 0) + 1 WHERE id = printer_id;
    INSERT INTO public.printer_events (printer_id, type) VALUES (printer_id, 'whatsapp_click');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Résumé chiffré réel pour les cartes du dashboard.
CREATE OR REPLACE FUNCTION public.get_printer_stats(p_printer_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_total_views BIGINT := 0;
    v_total_clicks BIGINT := 0;
    v_month_views BIGINT := 0;
    v_month_clicks BIGINT := 0;
    v_today_views BIGINT := 0;
    v_today_clicks BIGINT := 0;
BEGIN
    SELECT COALESCE(views, 0), COALESCE(clicks, 0)
    INTO v_total_views, v_total_clicks
    FROM public.printers WHERE id = p_printer_id;

    SELECT
        COUNT(*) FILTER (WHERE type = 'view'),
        COUNT(*) FILTER (WHERE type = 'whatsapp_click')
    INTO v_month_views, v_month_clicks
    FROM public.printer_events
    WHERE printer_id = p_printer_id AND created_at >= date_trunc('month', now());

    SELECT
        COUNT(*) FILTER (WHERE type = 'view'),
        COUNT(*) FILTER (WHERE type = 'whatsapp_click')
    INTO v_today_views, v_today_clicks
    FROM public.printer_events
    WHERE printer_id = p_printer_id AND created_at >= date_trunc('day', now());

    RETURN jsonb_build_object(
        'totalViews', v_total_views,
        'totalClicks', v_total_clicks,
        'monthViews', v_month_views,
        'monthClicks', v_month_clicks,
        'todayViews', v_today_views,
        'todayClicks', v_today_clicks
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_printer_stats(UUID) TO anon, authenticated;

-- 4. Série temporelle réelle des événements (pour le graphique du dashboard).
--    p_type ∈ 'view' | 'whatsapp_click' ; p_period ∈ today|week|month|year.
CREATE OR REPLACE FUNCTION public.get_printer_event_timeseries(p_printer_id UUID, p_type TEXT, p_period TEXT)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    IF p_period = 'today' THEN
        SELECT jsonb_agg(jsonb_build_object('ts', g.bucket, 'value', COALESCE(c.cnt, 0)) ORDER BY g.bucket)
        INTO result
        FROM generate_series(date_trunc('hour', now()) - interval '23 hours', date_trunc('hour', now()), interval '1 hour') AS g(bucket)
        LEFT JOIN (
            SELECT date_trunc('hour', created_at) AS h, count(*) AS cnt
            FROM public.printer_events
            WHERE printer_id = p_printer_id AND type = p_type AND created_at >= now() - interval '24 hours'
            GROUP BY 1
        ) c ON c.h = g.bucket;
    ELSIF p_period = 'week' THEN
        SELECT jsonb_agg(jsonb_build_object('ts', g.bucket, 'value', COALESCE(c.cnt, 0)) ORDER BY g.bucket)
        INTO result
        FROM generate_series(date_trunc('day', now()) - interval '6 days', date_trunc('day', now()), interval '1 day') AS g(bucket)
        LEFT JOIN (
            SELECT date_trunc('day', created_at) AS d, count(*) AS cnt
            FROM public.printer_events
            WHERE printer_id = p_printer_id AND type = p_type AND created_at >= date_trunc('day', now()) - interval '6 days'
            GROUP BY 1
        ) c ON c.d = g.bucket;
    ELSIF p_period = 'month' THEN
        SELECT jsonb_agg(jsonb_build_object('ts', g.bucket, 'value', COALESCE(c.cnt, 0)) ORDER BY g.bucket)
        INTO result
        FROM generate_series(date_trunc('day', now()) - interval '29 days', date_trunc('day', now()), interval '1 day') AS g(bucket)
        LEFT JOIN (
            SELECT date_trunc('day', created_at) AS d, count(*) AS cnt
            FROM public.printer_events
            WHERE printer_id = p_printer_id AND type = p_type AND created_at >= date_trunc('day', now()) - interval '29 days'
            GROUP BY 1
        ) c ON c.d = g.bucket;
    ELSE -- 'year'
        SELECT jsonb_agg(jsonb_build_object('ts', g.bucket, 'value', COALESCE(c.cnt, 0)) ORDER BY g.bucket)
        INTO result
        FROM generate_series(date_trunc('month', now()) - interval '11 months', date_trunc('month', now()), interval '1 month') AS g(bucket)
        LEFT JOIN (
            SELECT date_trunc('month', created_at) AS m, count(*) AS cnt
            FROM public.printer_events
            WHERE printer_id = p_printer_id AND type = p_type AND created_at >= date_trunc('month', now()) - interval '11 months'
            GROUP BY 1
        ) c ON c.m = g.bucket;
    END IF;

    RETURN COALESCE(result, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_printer_event_timeseries(UUID, TEXT, TEXT) TO anon, authenticated;
