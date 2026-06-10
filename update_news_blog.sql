-- =====================================================================
-- Printacote — Blog / Actualités : Catégories, Tags et Mentions
-- Migration pour ajouter le support des catégories, des tags et
-- des mentions d'imprimeurs dans les articles de blog.
-- À exécuter dans l'éditeur SQL de Supabase.
-- =====================================================================

-- 1. Ajout des colonnes de métadonnées de blog si elles n'existent pas
ALTER TABLE public.news ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Actualité';
ALTER TABLE public.news ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}'::text[];
ALTER TABLE public.news ADD COLUMN IF NOT EXISTS mentions UUID[] DEFAULT '{}'::uuid[];

-- 2. Recréation de la fonction RPC admin_upsert_news avec support des nouveaux champs
DROP FUNCTION IF EXISTS public.admin_upsert_news(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, TEXT, TEXT[], UUID[]);
CREATE OR REPLACE FUNCTION public.admin_upsert_news(
    p_token UUID,
    p_id UUID,
    p_title TEXT,
    p_excerpt TEXT,
    p_content TEXT,
    p_image_url TEXT,
    p_read_time TEXT,
    p_published BOOLEAN,
    p_category TEXT,
    p_tags TEXT[],
    p_mentions UUID[]
)
RETURNS UUID AS $$
DECLARE
    v_id UUID;
BEGIN
    -- Vérification de session
    PERFORM public.internal_verify_admin_session(p_token);

    IF p_id IS NULL THEN
        INSERT INTO public.news (
            title, 
            excerpt, 
            content, 
            image_url, 
            read_time, 
            published,
            category,
            tags,
            mentions
        )
        VALUES (
            p_title, 
            p_excerpt, 
            p_content, 
            p_image_url, 
            COALESCE(p_read_time, '5 min'), 
            COALESCE(p_published, true),
            COALESCE(p_category, 'Actualité'),
            COALESCE(p_tags, '{}'::text[]),
            COALESCE(p_mentions, '{}'::uuid[])
        )
        RETURNING id INTO v_id;
    ELSE
        UPDATE public.news
        SET 
            title = p_title, 
            excerpt = p_excerpt, 
            content = p_content,
            image_url = p_image_url, 
            read_time = COALESCE(p_read_time, '5 min'),
            published = COALESCE(p_published, true),
            category = COALESCE(p_category, 'Actualité'),
            tags = COALESCE(p_tags, '{}'::text[]),
            mentions = COALESCE(p_mentions, '{}'::uuid[])
        WHERE id = p_id
        RETURNING id INTO v_id;
    END IF;
    RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Révocation explicite des droits d'exécution publique
REVOKE EXECUTE ON FUNCTION public.admin_upsert_news(UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, TEXT, TEXT[], UUID[]) FROM PUBLIC, anon, authenticated;
