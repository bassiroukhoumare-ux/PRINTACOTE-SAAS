-- =====================================================================
-- Printacote — Rapport d'activité hebdomadaire admin
-- Calcule chaque semaine le nombre de visites (printer profile views)
-- et de clics WhatsApp réels et envoie un e-mail à l'admin (bskdezigner@gmail.com).
-- À exécuter dans l'éditeur SQL de Supabase.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.send_weekly_recap_email()
RETURNS VOID AS $$
DECLARE
  v_resend_api_key TEXT := 're_XeoRktvs_PsxnNiL6TgGc3Wz89BET2rY8'; 
  v_sender_email TEXT := 'notifications@printacote.com';
  v_admin_email TEXT := 'bskdezigner@gmail.com';
  
  -- Stats variables
  v_total_views INTEGER;
  v_total_clicks INTEGER;
  v_new_printers INTEGER;
  v_total_printers INTEGER;
  v_start_date TEXT;
  v_end_date TEXT;
  
  v_email_body TEXT;
BEGIN
  -- Query stats from the last 7 days
  SELECT count(*) INTO v_total_views 
  FROM public.printer_events 
  WHERE type = 'view' AND created_at >= now() - interval '7 days';

  SELECT count(*) INTO v_total_clicks 
  FROM public.printer_events 
  WHERE type = 'whatsapp_click' AND created_at >= now() - interval '7 days';

  SELECT count(*) INTO v_new_printers 
  FROM public.printers 
  WHERE created_at >= now() - interval '7 days';

  SELECT count(*) INTO v_total_printers 
  FROM public.printers;

  -- Formatting dates for the weekly period (local format)
  v_start_date := to_char(now() - interval '7 days', 'DD/MM/YYYY');
  v_end_date := to_char(now(), 'DD/MM/YYYY');

  -- Build HTML email in Midnight Luxe style
  v_email_body := '
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: ''Inter'', sans-serif; background-color: #FAF8F5; color: #1E1E26; margin: 0; padding: 40px 20px; }
        .card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 24px; border: 1px solid rgba(61, 11, 55, 0.08); overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.02); }
        .header { background-color: #3D0B37; padding: 40px 20px; text-align: center; color: #F5F5DC; }
        .logo { width: 60px; height: 60px; border-radius: 50%; border: 3px solid #F5F5DC; margin-bottom: 12px; background-color: #3D0B37; object-fit: cover; display: inline-block; }
        .header h1 { font-family: Georgia, serif; font-size: 24px; font-style: italic; margin: 0; font-weight: normal; }
        .content { padding: 40px 30px; text-align: center; }
        .period { font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; color: #C9A84C; margin-bottom: 24px; }
        .stats-grid { display: table; width: 100%; margin: 20px 0; }
        .stats-row { display: table-row; }
        .stats-col { display: table-cell; width: 50%; padding: 20px; border: 1px solid rgba(61, 11, 55, 0.08); text-align: center; background-color: #FAF8F5; border-radius: 16px; }
        .stat-value { font-size: 36px; font-weight: 900; color: #3D0B37; margin-bottom: 6px; }
        .stat-label { font-size: 12px; color: #666; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; }
        .footer { padding: 20px; text-align: center; font-size: 11px; color: rgba(0,0,0,0.3); border-top: 1px solid rgba(0,0,0,0.05); }
        .badge { display: inline-block; padding: 6px 12px; border-radius: 12px; font-size: 12px; font-weight: bold; background-color: #3D0B37; color: #F5F5DC; margin-top: 16px; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <img src="https://printacote.com/logo-p.png" class="logo" alt="Printacoté" />
          <h1>Rapport d''activité</h1>
        </div>
        <div class="content">
          <div class="period">Semaine du ' || v_start_date || ' au ' || v_end_date || '</div>
          <h2 style="color: #3D0B37; margin: 0 0 16px 0; font-weight: 800; font-size: 22px;">Performance de la plateforme</h2>
          <p style="color: #666; line-height: 1.6; font-size: 14px; margin-bottom: 30px;">
            Voici le récapitulatif hebdomadaire de l''activité globale sur Printacoté. Les statistiques réelles de navigation et de prise de contact.
          </p>
          
          <table style="width: 100%; border-collapse: separate; border-spacing: 12px;">
            <tr>
              <td style="width: 50%; background: #FAF8F5; border: 1px solid rgba(61, 11, 55, 0.08); border-radius: 16px; padding: 24px; text-align: center; vertical-align: middle;">
                <div class="stat-value">' || v_total_views || '</div>
                <div class="stat-label">Visites Profils</div>
              </td>
              <td style="width: 50%; background: #FAF8F5; border: 1px solid rgba(61, 11, 55, 0.08); border-radius: 16px; padding: 24px; text-align: center; vertical-align: middle;">
                <div class="stat-value">' || v_total_clicks || '</div>
                <div class="stat-label">Clics WhatsApp</div>
              </td>
            </tr>
            <tr>
              <td style="width: 50%; background: #FAF8F5; border: 1px solid rgba(61, 11, 55, 0.08); border-radius: 16px; padding: 24px; text-align: center; vertical-align: middle;">
                <div class="stat-value">' || v_new_printers || '</div>
                <div class="stat-label">Nouveaux Inscrits</div>
              </td>
              <td style="width: 50%; background: #FAF8F5; border: 1px solid rgba(61, 11, 55, 0.08); border-radius: 16px; padding: 24px; text-align: center; vertical-align: middle;">
                <div class="stat-value">' || v_total_printers || '</div>
                <div class="stat-label">Total Imprimeurs</div>
              </td>
            </tr>
          </table>

          <div class="badge">Système opérationnel</div>
        </div>
        <div class="footer">
          Ce rapport est automatisé. Si vous souhaitez modifier sa fréquence, contactez le support technique.<br>
          © 2026 Printacoté. Tous droits réservés.
        </div>
      </div>
    </body>
    </html>
  ';

  -- Call Resend API via pg_net (Weekly recap email)
  PERFORM net.http_post(
    url := 'https://api.resend.com/emails',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_resend_api_key
    ),
    body := jsonb_build_object(
      'from', v_sender_email,
      'to', v_admin_email,
      'subject', '📊 [Printacoté] Rapport Hebdomadaire d''Activité (' || v_total_views || ' visites)',
      'html', v_email_body
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================================
-- Planification via pg_cron
-- Nécessite l'extension pg_cron (souvent activée par défaut ou via l'UI Supabase).
-- Exécute la fonction chaque lundi à 08:00 AM UTC (08:00 AM heure du Sénégal).
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Supprimer la tâche si elle existe déjà pour éviter les doublons
SELECT cron.unschedule('send-weekly-recap') WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'send-weekly-recap'
);

-- Planifier la tâche hebdomadaire
SELECT cron.schedule('send-weekly-recap', '0 8 * * 1', $$ SELECT public.send_weekly_recap_email(); $$);
