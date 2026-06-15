-- Blindage du rate limit de récupération : interdire l'appel direct de
-- send_recovery_email depuis le navigateur (rôles anon / authenticated).
-- Seule l'Edge Function recovery-request, qui utilise la clé service_role
-- (laquelle ignore ce REVOKE), pourra encore déclencher l'envoi.
-- À exécuter manuellement dans l'éditeur SQL Supabase.

REVOKE EXECUTE ON FUNCTION public.send_recovery_email(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT
) FROM anon, authenticated;

-- Note : si une signature à 2 arguments existe encore en base, la révoquer aussi :
-- REVOKE EXECUTE ON FUNCTION public.send_recovery_email(TEXT, TEXT) FROM anon, authenticated;
