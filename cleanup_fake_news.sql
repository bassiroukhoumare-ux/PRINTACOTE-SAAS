-- Supprime les actualités fictives (articles de démonstration migrés au départ).
-- À exécuter une fois dans l'éditeur SQL de Supabase. La page Actualités du
-- site public n'affichera alors plus que les articles que tu créeras toi-même.
DELETE FROM public.news;
