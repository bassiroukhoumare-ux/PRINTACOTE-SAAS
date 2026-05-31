-- =====================================================================
-- Printacote — Démantèlement de la CONSOLE d'administration
-- Supprime UNIQUEMENT les fonctions SQL spécifiques au back-office
-- /adminprint (les RPC admin_*).
--
-- ⚠️ NE SUPPRIME PAS les tables partagées ni les RPC publiques/imprimeur,
-- car elles servent des fonctionnalités CONSERVÉES côté site public :
--   • system_settings   → bannière publicitaire (AdBanner)
--   • admin_messages     → messagerie support côté imprimeur (DashboardPage)
--   • site_views         → suivi réel du trafic (record_site_view)
--   • news               → actualités (NewsPage)
--   • products.suspended_until / reactivate_expired_products → marketplace
--   • printer_mark_messages_read, record_site_view → RPC non-admin
--
-- À exécuter dans l'éditeur SQL de Supabase.
-- =====================================================================

-- Statistiques & trafic (console)
DROP FUNCTION IF EXISTS public.admin_get_global_stats();
DROP FUNCTION IF EXISTS public.admin_get_views_timeseries(TEXT);

-- Modération des imprimeurs
DROP FUNCTION IF EXISTS public.admin_get_printers_list();
DROP FUNCTION IF EXISTS public.admin_toggle_printer_status(UUID, TEXT);
DROP FUNCTION IF EXISTS public.admin_delete_printer(UUID);
DROP FUNCTION IF EXISTS public.admin_update_printer_portfolio(UUID, JSONB);
DROP FUNCTION IF EXISTS public.admin_update_printer_services(UUID, JSONB);

-- Modération de la marketplace
DROP FUNCTION IF EXISTS public.admin_delete_product(UUID);
DROP FUNCTION IF EXISTS public.admin_toggle_product_status(UUID, TEXT);
DROP FUNCTION IF EXISTS public.admin_update_product(UUID, TEXT, NUMERIC, NUMERIC, NUMERIC, TEXT, JSONB);
DROP FUNCTION IF EXISTS public.admin_suspend_product(UUID, TIMESTAMPTZ);

-- Messagerie support (côté administration uniquement)
DROP FUNCTION IF EXISTS public.admin_get_messages();
DROP FUNCTION IF EXISTS public.admin_send_message(UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.admin_send_message_bulk(UUID[], TEXT, TEXT);
DROP FUNCTION IF EXISTS public.admin_mark_messages_read(UUID);

-- Réglages système (écriture via la console)
DROP FUNCTION IF EXISTS public.admin_set_setting(TEXT, JSONB);

-- Maintenance de schéma déclenchée par la console
DROP FUNCTION IF EXISTS public.admin_run_schema_updates();

-- NOTE : la bannière publicitaire ne pourra plus être MODIFIÉE (plus de console),
-- mais la dernière valeur enregistrée dans system_settings reste affichée.
-- Pour la changer sans console, mettre à jour la ligne directement :
--   UPDATE public.system_settings
--   SET value = jsonb_set(value, '{is_active}', 'false')
--   WHERE key = 'publicity_banner';
