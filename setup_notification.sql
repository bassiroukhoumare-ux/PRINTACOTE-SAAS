-- ========================================================================
-- CONFIGURATION DES NOTIFICATIONS PAR EMAIL SUR SUPABASE + RESEND
-- ========================================================================
-- Ce script configure un déclencheur (Trigger) sur la table 'products'.
-- Chaque fois qu'un produit est ajouté, Supabase appelle l'API de Resend
-- pour vous envoyer un email HTML complet avec la fiche du produit et
-- les informations détaillées du vendeur.
--
-- INSTRUCTIONS :
-- 1. Copiez l'intégralité de ce script.
-- 2. Allez sur votre tableau de bord Supabase -> SQL Editor -> New Query.
-- 3. Collez le code, modifiez les 3 variables de configuration ci-dessous.
-- 4. Cliquez sur "Run".
-- ========================================================================

-- Activer l'extension pg_net (permet à Postgres de faire des requêtes HTTP asynchrones)
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION public.handle_new_product_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_printer_name TEXT;
  v_printer_city TEXT;
  v_printer_country TEXT;
  v_printer_desc TEXT;
  v_product_image TEXT;
  v_email_body TEXT;
  
  -- ----------------------------------------------------------------------
  -- CONFIGURATION (À MODIFIER AVANT D'EXÉCUTER)
  -- ----------------------------------------------------------------------
  v_admin_email TEXT := 'VOTRE_EMAIL_RECEPTEUR_ADMIN@EXEMPLE.COM'; 
  -- (Ex: bassdesign523@gmail.com - Email qui recevra les notifications)

  v_sender_email TEXT := 'notifications@printacote.com'; 
  -- (L'adresse d'expédition. Doit utiliser votre nom de domaine configuré sur Resend)

  v_resend_api_key TEXT := 're_VOTRE_CLE_API_RESEND'; 
  -- (Votre clé API Resend secrète commencant par 're_')
  -- ----------------------------------------------------------------------

BEGIN
  -- 1. Récupérer les informations de l'imprimeur (le vendeur)
  SELECT 
    name, city, country, description
  INTO 
    v_printer_name, v_printer_city, v_printer_country, v_printer_desc
  FROM public.printers
  WHERE id = NEW.printer_id;

  -- Valeurs par défaut si le profil imprimeur n'est pas encore complet
  v_printer_name := COALESCE(v_printer_name, 'Imprimeur Inconnu');
  v_printer_city := COALESCE(v_printer_city, 'Non précisée');
  v_printer_country := COALESCE(v_printer_country, 'Sénégal');
  v_printer_desc := COALESCE(v_printer_desc, 'Aucune description disponible.');

  -- 2. Récupérer l'image du produit (prend la 1ère image du tableau, ou image par défaut)
  IF NEW.images IS NOT NULL AND array_length(NEW.images, 1) > 0 THEN
    v_product_image := NEW.images[1];
  ELSE
    v_product_image := 'https://images.unsplash.com/photo-1585776245991-cf89dd7fc53e?q=80&w=600';
  END IF;

  -- 3. Construction du template HTML de l'email (Charte graphique Luxe de Minuit : #3D0B37 et #F5F5DC)
  v_email_body := '
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Nouveau Produit Marketplace</title>
      <style>
        body { margin: 0; padding: 0; background-color: #FAF8F5; font-family: ''Inter'', -apple-system, sans-serif; color: #1E1E26; }
        .wrapper { width: 100%; background-color: #FAF8F5; padding: 40px 10px; }
        .card { max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border-radius: 30px; overflow: hidden; border: 1px solid rgba(61, 11, 55, 0.08); box-shadow: 0 20px 40px rgba(0,0,0,0.03); }
        .header { background-color: #3D0B37; padding: 40px 30px; text-align: center; }
        .header h1 { color: #F5F5DC; font-family: Georgia, serif; font-size: 26px; margin: 0 0 10px 0; font-weight: normal; font-style: italic; }
        .header p { color: rgba(245, 245, 220, 0.6); font-size: 11px; text-transform: uppercase; margin: 0; font-weight: bold; letter-spacing: 2px; }
        .content { padding: 40px 30px; }
        .section-title { font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: rgba(30, 30, 38, 0.4); margin: 0 0 15px 0; font-weight: 800; border-bottom: 1px solid rgba(30, 30, 38, 0.05); padding-bottom: 6px; }
        .product-table { width: 100%; background-color: #FAF8F5; border-radius: 20px; border: 1px solid rgba(61, 11, 55, 0.04); padding: 20px; margin-bottom: 35px; }
        .product-title { font-size: 18px; font-weight: 800; color: #3D0B37; margin: 0 0 6px 0; line-height: 1.3; }
        .product-price { font-size: 22px; font-weight: 900; color: #3D0B37; margin: 0 0 10px 0; }
        .product-desc { font-size: 13px; color: rgba(30, 30, 38, 0.7); margin: 0; line-height: 1.5; }
        .seller-card { margin-bottom: 35px; padding-left: 5px; }
        .seller-name { font-size: 16px; font-weight: bold; color: #3D0B37; margin: 0 0 4px 0; }
        .seller-loc { font-size: 12px; color: rgba(30, 30, 38, 0.5); margin: 0 0 12px 0; font-weight: bold; }
        .seller-desc { font-size: 13px; color: rgba(30, 30, 38, 0.7); margin: 0; line-height: 1.5; }
        .cta-container { text-align: center; padding: 10px 0; }
        .cta-btn { display: inline-block; background-color: #3D0B37; color: #F5F5DC; padding: 18px 36px; border-radius: 16px; font-weight: bold; text-decoration: none; font-size: 13px; text-transform: uppercase; letter-spacing: 1.5px; box-shadow: 0 10px 25px rgba(61, 11, 55, 0.15); }
        .footer { padding: 30px; text-align: center; font-size: 11px; color: rgba(30, 30, 38, 0.3); border-top: 1px solid rgba(30, 30, 38, 0.05); line-height: 1.4; }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="card">
          <!-- En-tête -->
          <div class="header" style="text-align: center;">
            <img src="https://printacote.com/logo-p.png" alt="Printacote" width="80" height="80" style="border-radius: 50%; border: 3px solid #F5F5DC; margin-bottom: 15px; background-color: #3D0B37; object-fit: cover; display: inline-block;" />
            <h1 style="margin-top: 0;">Nouveau produit en ligne</h1>
            <p>Notification Marketplace</p>
          </div>
          <!-- Contenu principal -->
          <div class="content">
            <!-- Section Produit -->
            <div class="section-title">Le Produit</div>
            <table class="product-table" border="0" cellpadding="0" cellspacing="0">
              <tr>
                <td width="130" valign="top" style="padding-right: 20px;">
                  <img src="' || v_product_image || '" alt="' || NEW.name || '" width="120" height="120" style="border-radius: 12px; object-fit: cover; border: 1px solid rgba(0,0,0,0.05);" />
                </td>
                <td valign="top">
                  <h3 class="product-title">' || NEW.name || '</h3>
                  <div class="product-price">' || to_char(NEW.price, 'FM999G999G999') || ' FCFA</div>
                  <p class="product-desc">' || COALESCE(NEW.description, 'Aucune description fournie.') || '</p>
                </td>
              </tr>
            </table>

            <!-- Section Vendeur -->
            <div class="section-title">L''Imprimeur / Vendeur</div>
            <div class="seller-card">
              <h4 class="seller-name">' || v_printer_name || '</h4>
              <div class="seller-loc">📍 ' || v_printer_city || ', ' || v_printer_country || '</div>
              <p class="seller-desc">' || v_printer_desc || '</p>
            </div>

            <!-- Bouton CTA -->
            <div class="cta-container">
              <a href="' || 'https://printacote.com/?product=' || NEW.id || '" class="cta-btn">Voir le produit sur la marketplace</a>
            </div>
          </div>
          <!-- Pied de page -->
          <div class="footer">
            Cet e-mail automatique de modération a été généré suite à la publication d''un nouveau consommable ou matériel sur la plateforme Printacoté.
          </div>
        </div>
      </div>
    </body>
    </html>
  ';

  -- 4. Appel HTTP POST asynchrone à l'API Resend
  PERFORM net.http_post(
    url := 'https://api.resend.com/emails',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_resend_api_key
    ),
    body := jsonb_build_object(
      'from', v_sender_email,
      'to', v_admin_email,
      'subject', '🔔 [Marketplace] Nouveau produit : ' || NEW.name || ' (' || NEW.price || ' FCFA)',
      'html', v_email_body
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Attacher le déclencheur (Trigger) à la table 'products'
DROP TRIGGER IF EXISTS on_product_created ON public.products;
CREATE TRIGGER on_product_created
  AFTER INSERT ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_product_notification();
