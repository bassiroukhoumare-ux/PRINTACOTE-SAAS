-- =====================================================================
-- Printacote — Blog / Actualités : CRUD admin + commentaires publics
-- Le contenu des articles est du HTML riche (éditeur WYSIWYG).
-- À exécuter dans l'éditeur SQL de Supabase.
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Colonne auteur (facultative) sur news.
ALTER TABLE public.news ADD COLUMN IF NOT EXISTS author TEXT DEFAULT 'Printacoté';

-- 2. Table des commentaires (sous chaque article).
CREATE TABLE IF NOT EXISTS public.comments (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    news_id       UUID REFERENCES public.news(id) ON DELETE CASCADE NOT NULL,
    author_name   TEXT NOT NULL,
    author_email  TEXT,
    content       TEXT NOT NULL,
    approved      BOOLEAN NOT NULL DEFAULT true,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS comments_news_idx ON public.comments (news_id, created_at DESC);

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- Lecture publique des commentaires approuvés.
DROP POLICY IF EXISTS "Public read approved comments" ON public.comments;
CREATE POLICY "Public read approved comments" ON public.comments
    FOR SELECT USING (approved = true);

-- Insertion publique (tout visiteur peut commenter).
DROP POLICY IF EXISTS "Anyone can post a comment" ON public.comments;
CREATE POLICY "Anyone can post a comment" ON public.comments
    FOR INSERT WITH CHECK (true);

-- 3. RPC admin : liste de TOUS les articles (publiés ou non).
DROP FUNCTION IF EXISTS public.admin_get_all_news();
CREATE OR REPLACE FUNCTION public.admin_get_all_news(p_token UUID)
RETURNS SETOF public.news AS $$
BEGIN
    PERFORM public.internal_verify_admin_session(p_token);
    RETURN QUERY SELECT * FROM public.news ORDER BY created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. RPC admin : créer ou mettre à jour un article (contourne la RLS).
DROP FUNCTION IF EXISTS public.admin_upsert_news(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN);
CREATE OR REPLACE FUNCTION public.admin_upsert_news(
    p_token UUID,
    p_id UUID,
    p_title TEXT,
    p_excerpt TEXT,
    p_content TEXT,
    p_image_url TEXT,
    p_read_time TEXT,
    p_published BOOLEAN
)
RETURNS UUID AS $$
DECLARE
    v_id UUID;
BEGIN
    -- Vérification de session
    PERFORM public.internal_verify_admin_session(p_token);

    IF p_id IS NULL THEN
        INSERT INTO public.news (title, excerpt, content, image_url, read_time, published)
        VALUES (p_title, p_excerpt, p_content, p_image_url, COALESCE(p_read_time, '5 min'), COALESCE(p_published, true))
        RETURNING id INTO v_id;
    ELSE
        UPDATE public.news
        SET title = p_title, excerpt = p_excerpt, content = p_content,
            image_url = p_image_url, read_time = COALESCE(p_read_time, '5 min'),
            published = COALESCE(p_published, true)
        WHERE id = p_id
        RETURNING id INTO v_id;
    END IF;
    RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. RPC admin : supprimer un article.
DROP FUNCTION IF EXISTS public.admin_delete_news(UUID);
CREATE OR REPLACE FUNCTION public.admin_delete_news(p_token UUID, p_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Vérification de session
    PERFORM public.internal_verify_admin_session(p_token);

    DELETE FROM public.news WHERE id = p_id;
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. RPC admin : tous les commentaires avec le titre de l'article.
DROP FUNCTION IF EXISTS public.admin_get_comments();
CREATE OR REPLACE FUNCTION public.admin_get_comments(p_token UUID)
RETURNS TABLE (
    id UUID, news_id UUID, news_title TEXT, author_name TEXT,
    author_email TEXT, content TEXT, approved BOOLEAN, created_at TIMESTAMPTZ
) AS $$
BEGIN
    -- Vérification de session
    PERFORM public.internal_verify_admin_session(p_token);

    RETURN QUERY
    SELECT c.id, c.news_id, n.title, c.author_name, c.author_email,
           c.content, c.approved, c.created_at
    FROM public.comments c
    LEFT JOIN public.news n ON n.id = c.news_id
    ORDER BY c.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. RPC admin : supprimer un commentaire.
DROP FUNCTION IF EXISTS public.admin_delete_comment(UUID);
CREATE OR REPLACE FUNCTION public.admin_delete_comment(p_token UUID, p_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Vérification de session
    PERFORM public.internal_verify_admin_session(p_token);

    DELETE FROM public.comments WHERE id = p_id;
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Révocation explicite des droits d'exécution publique
REVOKE EXECUTE ON FUNCTION public.admin_get_all_news(UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_upsert_news(UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_delete_news(UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_get_comments(UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_delete_comment(UUID, UUID) FROM PUBLIC, anon, authenticated;

-- 8. Incrément des vues d'un article (public).
CREATE OR REPLACE FUNCTION public.increment_news_views(p_id UUID)
RETURNS VOID AS $$
    UPDATE public.news SET views = COALESCE(views, 0) + 1 WHERE id = p_id;
$$ LANGUAGE sql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.increment_news_views(UUID) TO anon, authenticated;
