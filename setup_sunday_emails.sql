-- =====================================================================
-- Printacote — E-mails conseils hebdomadaires pour les imprimeurs (Dimanche)
-- =====================================================================
-- Description : Envoie un e-mail de conseils marketing et visibilité à tous 
-- les imprimeurs inscrits sur la plateforme chaque dimanche à midi pile (GMT).
--
-- Conçu pour stimuler l'engagement des membres en les encourageant à compléter
-- leurs produits, imprimer leur QR code et récolter des avis clients.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.send_sunday_tips_emails()
RETURNS VOID AS $$
DECLARE
  v_resend_api_key TEXT;
  v_sender_email TEXT;
  r RECORD;
  v_email_body TEXT;
BEGIN
  -- 1. Lire la clé API Resend
  SELECT value INTO v_resend_api_key FROM public.secure_configs WHERE key = 'resend_api_key';
  IF v_resend_api_key IS NULL THEN
    RAISE WARNING 'Clé API Resend manquante dans secure_configs. Impossible d''enlever les conseils du dimanche.';
    RETURN;
  END IF;

  -- 2. Lire l'expéditeur (sender_email)
  SELECT value INTO v_sender_email FROM public.secure_configs WHERE key = 'sender_email';
  IF v_sender_email IS NULL OR v_sender_email = '' THEN
    v_sender_email := 'notifications@printacote.com';
  END IF;

  -- 3. Boucler sur tous les imprimeurs actifs ayant un compte utilisateur Supabase
  FOR r IN 
    SELECT 
      p.id,
      p.first_name,
      p.name AS business_name,
      u.email::text AS email
    FROM public.printers p
    JOIN auth.users u ON p.owner_id = u.id
    WHERE p.status = 'active' OR p.status IS NULL
  LOOP
    IF r.email IS NOT NULL AND r.email <> '' THEN
      -- Construction du corps de l'e-mail au style Midnight Luxe
      v_email_body := '
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Boostez votre imprimerie sur Printacoté</title>
        <style>
          body { font-family: ''Inter'', -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, Helvetica, Arial, sans-serif; background-color: #FAF8F5; color: #2A2A35; margin: 0; padding: 40px 20px; }
          .card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 24px; border: 1px solid rgba(61, 11, 55, 0.08); overflow: hidden; box-shadow: 0 15px 35px rgba(61, 11, 55, 0.03); }
          .header { background-color: #3D0B37; padding: 40px 20px; text-align: center; color: #F5F5DC; border-bottom: 4px solid #C9A84C; }
          .logo { width: 60px; height: 60px; border-radius: 50%; border: 3px solid #C9A84C; margin-bottom: 12px; background-color: #3D0B37; object-fit: cover; display: inline-block; }
          .header h1 { font-family: ''Playfair Display'', Georgia, ''Times New Roman'', serif; font-size: 26px; font-style: italic; margin: 0; font-weight: normal; letter-spacing: 1px; color: #FAF8F5; }
          .content { padding: 40px 35px; text-align: left; line-height: 1.6; }
          .tips-title { color: #3D0B37; margin: 0 0 24px 0; font-weight: 800; font-size: 22px; text-align: center; font-family: ''Playfair Display'', Georgia, serif; }
          .highlight { color: #3D0B37; font-weight: bold; }
          .divider { height: 1px; background: rgba(61, 11, 55, 0.08); margin: 30px 0; }
          
          /* Tip cards list */
          .tip-card { background: #FAF8F5; border-radius: 16px; border: 1px solid rgba(61, 11, 55, 0.05); padding: 20px; margin-bottom: 16px; }
          .tip-icon { font-size: 24px; margin-bottom: 10px; display: block; }
          .tip-title { font-weight: 800; font-size: 16px; color: #3D0B37; margin: 0 0 8px 0; }
          .tip-desc { font-size: 13px; color: #555566; margin: 0; }
          
          /* Action Buttons */
          .btn-group { text-align: center; margin: 35px 0 15px; }
          .btn { text-decoration: none; padding: 16px 30px; border-radius: 12px; font-weight: bold; font-size: 14px; display: inline-block; transition: all 0.3s ease; margin: 8px 6px; }
          .btn-primary { background: #3D0B37; color: #FAF8F5 !important; box-shadow: 0 10px 20px rgba(61, 11, 55, 0.15); border: 1px solid #3D0B37; }
          .btn-outline { background: transparent; color: #3D0B37 !important; border: 1px solid #3D0B37; }
          
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
            <h2 class="tips-title">Booster la visibilité de votre imprimerie 🚀</h2>
            <p style="font-size: 15px; color: #1E1E26; margin-bottom: 20px;">
              Bonjour <strong>' || COALESCE(r.first_name, '') || '</strong>,
            </p>
            <p style="font-size: 14px; color: #555566; margin-bottom: 24px;">
              Le week-end se termine et une nouvelle semaine d''activité commence pour votre imprimerie <strong>' || COALESCE(r.business_name, 'votre vitrine') || '</strong>. C''est le moment idéal pour faire le point sur votre vitrine numérique et appliquer quelques conseils simples pour attirer de nouveaux clients.
            </p>
            
            <div class="tip-card">
              <span class="tip-icon">📦</span>
              <h4 class="tip-title">Ajoutez plus de produits et de services</h4>
              <p class="tip-desc">Une vitrine complète inspire confiance. N''hésitez pas à ajouter tous vos types de services d''impression (Offset, Numérique, Sublimation, Sérigraphie, Enseignes...) et à lister vos consommables ou matériels d''occasion sur notre Marketplace pour générer des ventes supplémentaires.</p>
            </div>

            <div class="tip-card">
              <span class="tip-icon">📲</span>
              <h4 class="tip-title">Imprimez et affichez votre code QR</h4>
              <p class="tip-desc">Avez-vous pensé à afficher votre code QR dans votre magasin physique ? Téléchargez-le depuis votre tableau de bord, imprimez-le et placez-le sur votre comptoir. Vos clients pourront le scanner en un instant pour voir vos réalisations et vos tarifs sur leur smartphone.</p>
            </div>

            <div class="tip-card">
              <span class="tip-icon">⭐</span>
              <h4 class="tip-title">Demandez des avis à vos clients</h4>
              <p class="tip-desc">Les avis sont le meilleur moyen d''augmenter votre réputation sur Printacoté. Plus vous accumulez d''avis positifs, plus votre imprimerie montera dans le classement de la plateforme, ce qui vous permettra d''être beaucoup mieux référencé dans les recherches des clients.</p>
            </div>

            <div class="btn-group">
              <a href="https://printacote.com/dashboard" class="btn btn-primary">Mon Espace Imprimeur</a>
              <a href="https://wa.me/221709465891" class="btn btn-outline">Contacter le Support</a>
            </div>
          </div>
          <div class="footer">
            <p style="margin: 0 0 10px 0;">Vous recevez cet e-mail car votre imprimerie est membre de Printacoté.</p>
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

      -- Envoi de l'email de manière asynchrone via pg_net (API Resend)
      BEGIN
        PERFORM net.http_post(
          url := 'https://api.resend.com/emails',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || v_resend_api_key
          ),
          body := jsonb_build_object(
            'from', v_sender_email,
            'to', r.email,
            'subject', '🚀 Boostez la visibilité de votre imprimerie sur Printacoté !',
            'html', v_email_body
          )
        );
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Échec de l''envoi de l''e-mail de conseils à % : %', r.email, SQLERRM;
      END;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =====================================================================
-- Planification de la tâche via pg_cron
-- Exécute la fonction chaque dimanche à 12:00 PM GMT (12:00 UTC)
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Supprimer la tâche si elle existe déjà pour éviter les doublons
SELECT cron.unschedule('send-sunday-tips') WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'send-sunday-tips'
);

-- Planifier la tâche hebdomadaire (0: minute, 12: heure, *: jour, *: mois, 0: dimanche)
SELECT cron.schedule('send-sunday-tips', '0 12 * * 0', $$ SELECT public.send_sunday_tips_emails(); $$);
