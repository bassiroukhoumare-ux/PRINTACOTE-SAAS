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
  v_sender_email TEXT := 'notifications@printacote.com'; 
  v_email_body TEXT;
BEGIN
  -- Read key from secure configs
  SELECT value INTO v_resend_api_key FROM public.secure_configs WHERE key = 'resend_api_key';
  IF v_resend_api_key IS NULL THEN
    RAISE EXCEPTION 'Clé API Resend manquante dans secure_configs.';
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
        <style>
          body { font-family: ''Inter'', sans-serif; background-color: #FAF8F5; color: #1E1E26; margin: 0; padding: 40px 20px; }
          .card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 24px; border: 1px solid rgba(61, 11, 55, 0.08); overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.02); }
          .header { background-color: #3D0B37; padding: 40px 20px; text-align: center; color: #F5F5DC; }
          .logo { width: 60px; height: 60px; border-radius: 50%; border: 3px solid #F5F5DC; margin-bottom: 12px; background-color: #3D0B37; object-fit: cover; display: inline-block; }
          .header h1 { font-family: Georgia, serif; font-size: 24px; font-style: italic; margin: 0; font-weight: normal; }
          .content { padding: 40px 30px; text-align: left; line-height: 1.6; }
          .welcome-title { color: #3D0B37; margin: 0 0 20px 0; font-weight: 800; font-size: 22px; text-align: center; }
          .feature-list { margin: 24px 0; padding-left: 20px; }
          .feature-item { margin-bottom: 12px; font-size: 14px; color: #2A2A35; }
          .btn-container { text-align: center; margin: 35px 0 20px; }
          .btn { background: #3D0B37; color: #F5F5DC !important; text-decoration: none; padding: 16px 32px; border-radius: 12px; font-weight: bold; font-size: 14px; display: inline-block; box-shadow: 0 10px 20px rgba(61, 11, 55, 0.15); }
          .footer { padding: 25px; text-align: center; font-size: 11px; color: rgba(0,0,0,0.4); border-top: 1px solid rgba(0,0,0,0.05); line-height: 1.5; }
          .footer a { color: #3D0B37; text-decoration: underline; }
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
            <p style="font-size: 15px; color: #2A2A35;">
              Bonjour <strong>' || COALESCE(NEW.first_name, '') || ' ' || COALESCE(NEW.last_name, '') || '</strong>,
            </p>
            <p style="font-size: 14px; color: #555;">
              Nous sommes ravis de vous accueillir au sein de notre réseau professionnel. Votre imprimerie <strong>' || COALESCE(NEW.name, 'Mon Imprimerie') || '</strong> est désormais visible sur la plateforme.
            </p>
            <p style="font-size: 14px; color: #555;">
              Printacoté connecte instantanément les imprimeurs locaux avec des clients professionnels et particuliers. Voici comment tirer le meilleur parti de votre nouvel espace :
            </p>
            
            <ul class="feature-list">
              <li class="feature-item">
                <strong>✨ Personnalisez votre profil public</strong> : Ajoutez vos réalisations marquantes dans votre portfolio, vos spécialités (Offset, Numérique, etc.) et téléchargez votre affiche QR code pour attirer les clients en physique.
              </li>
              <li class="feature-item">
                <strong>📈 Suivez vos statistiques</strong> : Accédez à votre tableau de bord en temps réel pour analyser le trafic, les vues de votre page et le nombre de clics sur vos boutons de contact (WhatsApp / Téléphone).
              </li>
              <li class="feature-item">
                <strong>🛒 Marketplace intégrée</strong> : Achetez ou revendez du matériel d''impression professionnel et des consommables dans notre espace marketplace.
              </li>
            </ul>

            <div class="btn-container">
              <a href="https://printacote.com/dashboard" class="btn">Accéder à mon tableau de bord</a>
            </div>
          </div>
          <div class="footer">
            Vous avez des questions ? Notre équipe administrative est à votre disposition.<br>
            Besoin d''aide ? <a href="https://wa.me/221709465891">Contactez le support sur WhatsApp</a><br><br>
            <a href="https://printacote.com/terms">Conditions d''utilisation</a> • <a href="https://printacote.com/privacy">Politique de confidentialité</a><br><br>
            © 2026 Printacoté. Tous droits réservés.
          </div>
        </div>
      </body>
      </html>
    ';

    -- Call Resend API via pg_net to send welcome email to the printer
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
