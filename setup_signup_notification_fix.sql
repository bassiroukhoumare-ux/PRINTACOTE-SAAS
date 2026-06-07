-- =====================================================================
-- Printacote — Correctif notification e-mail « Nouvelle inscription »
-- =====================================================================
-- Problème : la fonction notify_admin_on_signup envoie l'e-mail admin AU
-- MOMENT DE LA CRÉATION du profil imprimeur. Pour une inscription via Google,
-- le compte est créé avant que la personne n'ait saisi ses infos (nom de
-- l'imprimerie, WhatsApp, localisation...), donc l'e-mail part vide.
--
-- Correctif (sans modifier le corps de la fonction) : on remplace le trigger
-- unique « AFTER INSERT » par deux triggers conditionnels :
--   1. À l'INSERT, uniquement si le profil est déjà complet (formulaire classique).
--   2. À l'UPDATE, uniquement quand le profil passe d'incomplet à complet
--      (cas Google : la personne remplit le formulaire d'onboarding).
-- Résultat : un seul e-mail, toujours avec les vraies informations.
--
-- À exécuter dans l'éditeur SQL de Supabase.
-- =====================================================================

-- 1. Supprime tout trigger existant sur public.printers qui appelle
--    notify_admin_on_signup (nom inconnu / variable selon l'installation).
DO $$
DECLARE t record;
BEGIN
  FOR t IN
    SELECT tgname
    FROM pg_trigger
    WHERE tgrelid = 'public.printers'::regclass
      AND NOT tgisinternal
      AND tgfoid = 'public.notify_admin_on_signup'::regproc
  LOOP
    EXECUTE format('DROP TRIGGER %I ON public.printers', t.tgname);
  END LOOP;
END $$;

-- 2. INSERT : envoie l'e-mail seulement si le profil est déjà complet
--    (inscription via le formulaire classique, infos fournies d'emblée).
CREATE TRIGGER trg_notify_admin_on_signup_insert
  AFTER INSERT ON public.printers
  FOR EACH ROW
  WHEN (
    NEW.whatsapp IS NOT NULL AND btrim(NEW.whatsapp) <> ''
    AND NEW.name IS NOT NULL AND NEW.name <> 'Mon Imprimerie'
  )
  EXECUTE FUNCTION public.notify_admin_on_signup();

-- 3. UPDATE : envoie l'e-mail au moment où le profil devient complet
--    (inscription via Google : passage d'incomplet -> complet via l'onboarding).
--    La condition sur OLD garantit que l'e-mail ne part qu'une seule fois et
--    pas à chaque modification ultérieure du profil.
CREATE TRIGGER trg_notify_admin_on_signup_update
  AFTER UPDATE ON public.printers
  FOR EACH ROW
  WHEN (
    NEW.whatsapp IS NOT NULL AND btrim(NEW.whatsapp) <> ''
    AND NEW.name IS NOT NULL AND NEW.name <> 'Mon Imprimerie'
    AND (
      OLD.whatsapp IS NULL OR btrim(OLD.whatsapp) = ''
      OR OLD.name IS NULL OR OLD.name = 'Mon Imprimerie'
    )
  )
  EXECUTE FUNCTION public.notify_admin_on_signup();
