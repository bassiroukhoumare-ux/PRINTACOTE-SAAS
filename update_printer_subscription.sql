-- =====================================================================
-- RPC : Mettre à jour manuellement l'abonnement d'un imprimeur (contourne RLS)
-- À exécuter dans l'éditeur SQL de Supabase.
-- =====================================================================

DROP FUNCTION IF EXISTS public.admin_update_printer_subscription(UUID, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TEXT);
CREATE OR REPLACE FUNCTION public.admin_update_printer_subscription(
    p_token UUID,
    p_printer_id UUID,
    p_status TEXT,
    p_ends_at TIMESTAMPTZ,
    p_trial_ends_at TIMESTAMPTZ,
    p_plan TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Vérification de session
    PERFORM public.internal_verify_admin_session(p_token);

    UPDATE public.printers
    SET subscription_status = p_status,
        subscription_ends_at = p_ends_at,
        trial_ends_at = p_trial_ends_at,
        subscription_plan = p_plan,
        -- Force le statut boutique en ligne si abonnement actif
        status = CASE WHEN p_status = 'active' THEN 'En ligne' ELSE status END
    WHERE id = p_printer_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Révocation explicite des droits d'exécution publique
REVOKE EXECUTE ON FUNCTION public.admin_update_printer_subscription(UUID, UUID, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TEXT) FROM PUBLIC, anon, authenticated;
