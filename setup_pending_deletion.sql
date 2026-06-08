-- =====================================================================
-- Printacote — Colonnes pour la suppression planifiée des comptes
-- =====================================================================
-- À exécuter dans l'éditeur SQL de Supabase.
-- =====================================================================

ALTER TABLE public.printers ADD COLUMN IF NOT EXISTS deletion_scheduled_at TIMESTAMPTZ;
ALTER TABLE public.printers ADD COLUMN IF NOT EXISTS deletion_reason TEXT;
