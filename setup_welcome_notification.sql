-- =====================================================================
-- Printacote — Welcome E-mail Notification for New Users (Printers)
-- =====================================================================
-- Description : Sends a beautifully designed welcome e-mail to the printer 
-- once their profile onboarding is completed (whether through manual signup 
-- or Google registration onboarding).
--
-- This script mirrors the 2-trigger strategy used for admin signup alerts
-- to guarantee that the e-mail is sent exactly once, when full details 
-- (first name, last name, business name, WhatsApp) are ready.
-- =====================================================================

-- 1. Create or replace the function to send the welcome email
CREATE OR REPLACE FUNCTION public.notify_user_on_signup()
RETURNS TRIGGER AS $$
DECLARE
  v_email TEXT;
  v_resend_api_key TEXT; 
  v_sender_email TEXT; 
  v_email_body TEXT;
BEGIN
  -- Read key from secure configs
  SELECT value INTO v_resend_api_key FROM public.secure_configs WHERE key = 'resend_api_key';
  IF v_resend_api_key IS NULL THEN
    -- Log warning instead of exception to prevent blocking user signups if email service is not configured
    RAISE WARNING 'Clé API Resend manquante dans secure_configs. L''e-mail de bienvenue n''a pas pu être envoyé.';
    RETURN NEW;
  END IF;

  -- Read sender email from secure configs, default to onboarding@resend.dev or notifications@printacote.com
  SELECT value INTO v_sender_email FROM public.secure_configs WHERE key = 'sender_email';
  IF v_sender_email IS NULL OR v_sender_email = '' THEN
    v_sender_email := 'notifications@printacote.com';
  END IF;

  -- Get user email from auth.users using owner_id
  SELECT email INTO v_email 
  FROM auth.users 
  WHERE id = NEW.owner_id;

  IF v_email IS NOT NULL THEN
    -- Build HTML email in French with Midnight Luxe branding
    v_email_body := '
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Bienvenue sur Printacoté</title>
        <style>
          body { font-family: ''Inter'', -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, Helvetica, Arial, sans-serif; background-color: #FAF8F5; color: #2A2A35; margin: 0; padding: 40px 20px; }
          .card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 24px; border: 1px solid rgba(61, 11, 55, 0.08); overflow: hidden; box-shadow: 0 15px 35px rgba(61, 11, 55, 0.03); }
          .header { background-color: #3D0B37; padding: 40px 20px; text-align: center; color: #F5F5DC; border-bottom: 4px solid #C9A84C; }
          .logo { width: 60px; height: 60px; border-radius: 50%; border: 3px solid #C9A84C; margin-bottom: 12px; background-color: #3D0B37; object-fit: cover; display: inline-block; }
          .header h1 { font-family: ''Playfair Display'', Georgia, ''Times New Roman'', serif; font-size: 26px; font-style: italic; margin: 0; font-weight: normal; letter-spacing: 1px; color: #FAF8F5; }
          .content { padding: 40px 35px; text-align: left; line-height: 1.6; }
          .welcome-title { color: #3D0B37; margin: 0 0 24px 0; font-weight: 800; font-size: 22px; text-align: center; font-family: ''Playfair Display'', Georgia, serif; }
          .highlight { color: #3D0B37; font-weight: bold; }
          .divider { height: 1px; background: rgba(61, 11, 55, 0.08); margin: 30px 0; }
          
          /* Step cards list */
          .step-card { background: #FAF8F5; border-radius: 16px; border: 1px solid rgba(61, 11, 55, 0.05); padding: 20px; margin-bottom: 16px; }
          .step-num { font-family: monospace; color: #C9A84C; font-weight: bold; font-size: 14px; text-transform: uppercase; margin-bottom: 6px; display: block; letter-spacing: 1px; }
          .step-title { font-weight: 800; font-size: 15px; color: #3D0B37; margin: 0 0 8px 0; }
          .step-desc { font-size: 13px; color: #555566; margin: 0; }
          
          /* Share block */
          .share-block { background: rgba(201, 168, 76, 0.08); border-left: 4px solid #C9A84C; border-radius: 8px; padding: 16px 20px; margin: 24px 0; }
          .share-title { font-weight: bold; color: #3D0B37; margin-bottom: 6px; font-size: 14px; }
          .share-text { font-size: 13px; color: #555566; margin: 0; }

          /* Action Buttons */
          .btn-group { text-align: center; margin: 35px 0 15px; }
          .btn { text-decoration: none; padding: 16px 30px; border-radius: 12px; font-weight: bold; font-size: 14px; display: inline-block; transition: all 0.3s ease; margin: 8px 6px; }
          .btn-primary { background: #3D0B37; color: #FAF8F5 !important; box-shadow: 0 10px 20px rgba(61, 11, 55, 0.15); border: 1px solid #3D0B37; }
          .btn-success { background: #25D366; color: #ffffff !important; box-shadow: 0 10px 20px rgba(37, 211, 102, 0.15); border: 1px solid #25D366; }
          
          .footer { padding: 30px; text-align: center; font-size: 12px; color: rgba(30, 30, 38, 0.5); border-top: 1px solid rgba(61, 11, 55, 0.05); background-color: #FAF8F5; line-height: 1.6; }
          .footer a { color: #3D0B37; text-decoration: underline; font-weight: 600; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="header">
            <img src="https://printacote.com/Fichier%207.png" class="logo" alt="Printacoté" />
            <h1>Printacoté</h1>
          </div>
          <div class="content">
            <h2 class="welcome-title">Bienvenue sur Printacoté, ' || COALESCE(NEW.first_name, '') || ' !</h2>
            <p style="font-size: 15px; color: #1E1E26; margin-bottom: 20px;">
              Bonjour <strong>' || COALESCE(NEW.first_name, '') || ' ' || COALESCE(NEW.last_name, '') || '</strong>,
            </p>
            <p style="font-size: 14px; color: #555566; margin-bottom: 24px;">
              Nous sommes ravis de vous accueillir sur <span class="highlight">Printacoté</span>, la première plateforme de référence qui connecte instantanément les imprimeurs locaux au Sénégal avec leurs futurs clients. Votre imprimerie <strong>' || COALESCE(NEW.name, 'Mon Imprimerie') || '</strong> dispose désormais d''une vitrine numérique professionnelle.
            </p>
            
            <p style="font-size: 14px; color: #3D0B37; font-weight: 800; margin-bottom: 16px; text-transform: uppercase; tracking-wider; font-size: 12px;">
              🛠️ Guide d''installation rapide de votre vitrine :
            </p>

            <div class="step-card">
              <span class="step-num">Étape 01</span>
              <h4 class="step-title">Complétez vos Services et Spécialités</h4>
              <p class="step-desc">Rendez-vous dans l''onglet <strong>Services</strong> de votre tableau de bord. Indiquez vos types d''impression (Offset, Numérique, Grand Format, Sublimation, Sérigraphie) pour aider les clients à vous trouver selon leurs besoins exacts.</p>
            </div>

            <div class="step-card">
              <span class="step-num">Étape 02</span>
              <h4 class="step-title">Sublimez votre Portfolio</h4>
              <p class="step-desc">Uploadez vos réalisations marquantes dans l''onglet <strong>Portfolio</strong>. Des photos nettes et de qualité de vos réalisations (flyers, brochures, enseignes, packaging) sont la clé pour capter l''attention des clients exigeants.</p>
            </div>

            <div class="step-card">
              <span class="step-num">Étape 03</span>
              <h4 class="step-title">Publiez vos Offres de Consommables ou Papiers</h4>
              <p class="step-desc">Si vous avez des surplus de papier, des consommables ou du matériel professionnel d''occasion, mettez-les en vente en quelques clics via l''onglet <strong>Marketplace</strong>.</p>
            </div>

            <div class="divider"></div>

            <div class="share-block">
              <div class="share-title">📢 Boostez vos visites et votre visibilité locale</div>
              <p class="share-text">Dès que votre boutique est active, copiez son lien unique et <strong>partagez-le sur vos statuts WhatsApp</strong>, ainsi que sur Facebook et Instagram. C''est le moyen le plus efficace de promouvoir votre présence digitale auprès de vos clients existants et de votre communauté.</p>
            </div>

            <div class="btn-group">
              <a href="https://printacote.com/dashboard" class="btn btn-primary">Mon Tableau de Bord</a>
              <a href="https://chat.whatsapp.com/FHRX9bhnJOV0VLjzAxLqCX?s=cl&p=i&ilr=4" class="btn btn-success">Rejoindre la Communauté</a>
            </div>
          </div>
          <div class="footer">
            <p style="margin: 0 0 10px 0;">Besoin d''aide ou de conseils ? Notre équipe support est à vos côtés.</p>
            <p style="margin: 0 0 20px 0;"><a href="https://wa.me/221709465891">📞 Contacter le Support sur WhatsApp</a></p>
            <p style="font-size: 11px; color: rgba(30, 30, 38, 0.4); margin: 0;">
              <a href="https://printacote.com/terms">Conditions d''utilisation</a> • <a href="https://printacote.com/privacy">Confidentialité</a>
              <br><br>
              © 2026 Printacoté. Tous droits réservés.
            </p>
          </div>
        </div>
      </body>
      </html>
    ';

    -- Call Resend API via pg_net to send welcome email to the printer
    BEGIN
      PERFORM net.http_post(
        url := 'https://api.resend.com/emails',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || v_resend_api_key
        ),
        body := jsonb_build_object(
          'from', v_sender_email,
          'to', v_email,
          'subject', '🎉 Bienvenue sur Printacoté - Votre profil est en ligne !',
          'html', v_email_body
        )
      );
    EXCEPTION WHEN OTHERS THEN
      -- Capture exception so signup transaction is not aborted if email sending fails
      RAISE WARNING 'Échec de l''envoi de l''e-mail de bienvenue à % : %', v_email, SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. Drop existing triggers to avoid conflicts on update
DROP TRIGGER IF EXISTS trg_notify_user_on_signup_insert ON public.printers;
DROP TRIGGER IF EXISTS trg_notify_user_on_signup_update ON public.printers;


-- 3. Trigger at INSERT: Trigger email only if printer profile is already complete
--    (classical registration form where WhatsApp/Name are provided initially)
CREATE TRIGGER trg_notify_user_on_signup_insert
  AFTER INSERT ON public.printers
  FOR EACH ROW
  WHEN (
    NEW.whatsapp IS NOT NULL AND btrim(NEW.whatsapp) <> ''
    AND NEW.name IS NOT NULL AND NEW.name <> 'Mon Imprimerie'
  )
  EXECUTE FUNCTION public.notify_user_on_signup();


-- 4. Trigger at UPDATE: Trigger email when printer profile goes from incomplete to complete
--    (Google authentication signup: users complete their onboarding form)
CREATE TRIGGER trg_notify_user_on_signup_update
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
  EXECUTE FUNCTION public.notify_user_on_signup();
