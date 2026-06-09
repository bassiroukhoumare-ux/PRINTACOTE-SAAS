-- Enable UUID and pg_net extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 0. Clean up existing tables (Optional, use with caution)
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS portfolio CASCADE;
DROP TABLE IF EXISTS services CASCADE;
DROP TABLE IF EXISTS printers CASCADE;

-- 1. Create Printers Table
CREATE TABLE IF NOT EXISTS printers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    location TEXT, -- This will be the full/display location
    country TEXT DEFAULT 'Sénégal',
    city TEXT,
    exact_address TEXT,
    whatsapp TEXT,
    phone TEXT,
    logo_url TEXT,
    cover_url TEXT,
    rating NUMERIC DEFAULT 5.0,
    website TEXT,
    address TEXT,
    first_name TEXT,
    last_name TEXT,
    views INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    status TEXT DEFAULT 'Désactivé',
    services JSONB DEFAULT '[]'::jsonb,
    portfolio JSONB DEFAULT '[]'::jsonb,
    facebook TEXT,
    instagram TEXT,
    tiktok TEXT,
    reviews JSONB DEFAULT '[]'::jsonb,
    name_last_modified_at TIMESTAMP WITH TIME ZONE,
    trial_ends_at TIMESTAMP WITH TIME ZONE,
    subscription_status TEXT DEFAULT 'trial',
    subscription_ends_at TIMESTAMP WITH TIME ZONE,
    subscription_plan TEXT,
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 2. Create Services Table
CREATE TABLE IF NOT EXISTS services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    printer_id UUID REFERENCES printers(id) ON DELETE CASCADE,
    name TEXT NOT NULL
);

-- 3. Create Portfolio Table
CREATE TABLE IF NOT EXISTS portfolio (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    printer_id UUID REFERENCES printers(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL
);

-- 4. Create Products Table
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    printer_id UUID REFERENCES printers(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    price DECIMAL NOT NULL,
    promo_price DECIMAL,
    discount INTEGER,
    description TEXT,
    status TEXT DEFAULT 'En ligne',
    images TEXT[], -- Array of image URLs
    options JSONB, -- Advanced options like quantity, quality, etc.
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Set up Row Level Security (RLS)
ALTER TABLE printers ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Policies (Public read, Authenticated manage)
CREATE POLICY "Public read for everyone" ON printers FOR SELECT USING (true);
CREATE POLICY "Users can create their own printer profile" ON printers FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Printers can update their own data" ON printers FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Public read for services" ON services FOR SELECT USING (true);
CREATE POLICY "Printers can manage services" ON services FOR ALL USING (
    EXISTS (SELECT 1 FROM printers WHERE id = services.printer_id AND owner_id = auth.uid())
);

CREATE POLICY "Public read for portfolio" ON portfolio FOR SELECT USING (true);
CREATE POLICY "Printers can manage portfolio" ON portfolio FOR ALL USING (
    EXISTS (SELECT 1 FROM printers WHERE id = portfolio.printer_id AND owner_id = auth.uid())
);

CREATE POLICY "Public read for products" ON products FOR SELECT USING (true);
CREATE POLICY "Printers can manage products" ON products FOR ALL USING (
    EXISTS (SELECT 1 FROM printers WHERE id = products.printer_id AND owner_id = auth.uid())
);

-- 6. Trigger to automatically create a printer profile on user signup
-- This avoids RLS insert policy issues when email confirmation is enabled.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.printers (
    owner_id,
    name,
    city,
    country,
    whatsapp,
    first_name,
    last_name,
    logo_url,
    cover_url,
    rating,
    views,
    status,
    trial_ends_at,
    subscription_status
  ) VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'business_name', 'Mon Imprimerie'),
    COALESCE(new.raw_user_meta_data->>'city', ''),
    COALESCE(new.raw_user_meta_data->>'country', 'Sénégal'),
    COALESCE(new.raw_user_meta_data->>'whatsapp', ''),
    COALESCE(new.raw_user_meta_data->>'first_name', ''),
    COALESCE(new.raw_user_meta_data->>'last_name', ''),
    'https://ui-avatars.com/api/?name=' || replace(COALESCE(new.raw_user_meta_data->>'business_name', 'Mon Imprimerie'), ' ', '+') || '&background=random',
    'https://images.unsplash.com/photo-1562664347-4950157077a9?q=80&w=2500&auto=format&fit=crop',
    5.0,
    0,
    'Désactivé',
    now() + interval '14 days',
    'trial'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- 7. View tracking RPC function bypassing RLS
CREATE OR REPLACE FUNCTION public.increment_printer_views(printer_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.printers
  SET views = COALESCE(views, 0) + 1
  WHERE id = printer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 8. Clicks tracking RPC function bypassing RLS
CREATE OR REPLACE FUNCTION public.increment_printer_clicks(printer_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.printers
  SET clicks = COALESCE(clicks, 0) + 1
  WHERE id = printer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 9. Recovery email stored procedure using Resend API key
CREATE OR REPLACE FUNCTION public.send_recovery_email(
  email_to TEXT, 
  recovery_code TEXT,
  client_ip TEXT DEFAULT NULL,
  client_location TEXT DEFAULT NULL,
  client_device TEXT DEFAULT NULL,
  p_resend_api_key TEXT DEFAULT NULL,
  p_sender_email TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_resend_api_key TEXT := COALESCE(NULLIF(p_resend_api_key, ''), 're_XeoRktvs_PsxnNiL6TgGc3Wz89BET2rY8'); 
  v_sender_email TEXT := COALESCE(NULLIF(p_sender_email, ''), 'onboarding@resend.dev'); 
  v_admin_email TEXT := 'bskdezigner@gmail.com';
  v_email_body TEXT;
  v_admin_email_body TEXT;
  
  -- User details lookup
  v_first_name TEXT;
  v_last_name TEXT;
  v_printer_name TEXT;
  v_senegal_time TEXT;
BEGIN
  -- Check if user exists in auth.users
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = email_to) THEN
    RAISE EXCEPTION 'L''adresse email n''existe pas dans notre base de données.';
  END IF;

  -- Look up printer profile
  SELECT p.first_name, p.last_name, p.name
  INTO v_first_name, v_last_name, v_printer_name
  FROM public.printers p
  JOIN auth.users u ON p.owner_id = u.id
  WHERE u.email = email_to;

  -- Fallback to auth.users raw metadata if not found
  IF v_first_name IS NULL AND v_last_name IS NULL THEN
    SELECT 
      COALESCE(raw_user_meta_data->>'first_name', ''), 
      COALESCE(raw_user_meta_data->>'last_name', ''), 
      COALESCE(raw_user_meta_data->>'business_name', 'Imprimeur Inconnu')
    INTO v_first_name, v_last_name, v_printer_name
    FROM auth.users
    WHERE email = email_to;
  END IF;
  
  -- Fallback defaults
  v_first_name := COALESCE(v_first_name, '');
  v_last_name := COALESCE(v_last_name, '');
  v_printer_name := COALESCE(v_printer_name, email_to);

  -- Get Senegal Time (UTC+0)
  v_senegal_time := to_char(now() AT TIME ZONE 'UTC', 'DD/MM/YYYY HH24:MI:SS') || ' UTC';

  -- Build HTML email in French with Midnight Luxe colors and logo
  v_email_body := '
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: ''Inter'', sans-serif; background-color: #FAF8F5; color: #1E1E26; margin: 0; padding: 40px 20px; }
        .card { max-width: 500px; margin: 0 auto; background: #ffffff; border-radius: 24px; border: 1px solid rgba(61, 11, 55, 0.08); overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.02); }
        .header { background-color: #3D0B37; padding: 40px 20px; text-align: center; color: #F5F5DC; }
        .logo { width: 60px; height: 60px; border-radius: 50%; border: 3px solid #F5F5DC; margin-bottom: 12px; background-color: #3D0B37; object-fit: cover; display: inline-block; }
        .header h1 { font-family: Georgia, serif; font-size: 24px; font-style: italic; margin: 0; font-weight: normal; }
        .content { padding: 40px 30px; text-align: center; }
        .code-box { background: #3D0B37; color: #FAF8F5; font-size: 32px; font-weight: 900; letter-spacing: 6px; padding: 20px; border-radius: 16px; margin: 30px 0; display: inline-block; font-family: monospace; }
        .footer { padding: 20px; text-align: center; font-size: 11px; color: rgba(0,0,0,0.3); border-top: 1px solid rgba(0,0,0,0.05); }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <img src="https://printacote.com/Fichier%207.png" class="logo" alt="Printacoté" />
          <h1>Printacoté</h1>
        </div>
        <div class="content">
          <h2 style="color: #3D0B37; margin: 0 0 16px 0; font-weight: 800; font-size: 20px;">Récupération de votre compte</h2>
          <p style="color: #666; line-height: 1.6; font-size: 14px;">
            Bonjour,<br>
            Vous avez demandé la récupération de votre compte professionnel Printacoté. Voici votre code de vérification à usage unique :
          </p>
          <div class="code-box">' || recovery_code || '</div>
          <p style="color: #666; line-height: 1.6; font-size: 13px; font-weight: bold;">
            Une fois connecté à votre tableau de bord, nous vous prions de modifier immédiatement votre mot de passe depuis la section sécurité de votre profil.
          </p>
        </div>
        <div class="footer">
          Si vous n''êtes pas à l''origine de cette demande, vous pouvez ignorer cet e-mail en toute sécurité.<br>
          © 2026 Printacoté. Tous droits réservés.
        </div>
      </div>
    </body>
    </html>
  ';

  -- Call Resend API via pg_net (User recovery code email)
  PERFORM net.http_post(
    url := 'https://api.resend.com/emails',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_resend_api_key
    ),
    body := jsonb_build_object(
      'from', v_sender_email,
      'to', email_to,
      'subject', '🔑 [Printacoté] Votre code de récupération temporaire',
      'html', v_email_body
    )
  );

  -- Build HTML email for Admin notification (Midnight Luxe)
  v_admin_email_body := '
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: ''Inter'', sans-serif; background-color: #FAF8F5; color: #1E1E26; margin: 0; padding: 40px 20px; }
        .card { max-width: 550px; margin: 0 auto; background: #ffffff; border-radius: 24px; border: 1px solid rgba(61, 11, 55, 0.08); overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.02); }
        .header { background-color: #3D0B37; padding: 40px 20px; text-align: center; color: #F5F5DC; }
        .logo { width: 60px; height: 60px; border-radius: 50%; border: 3px solid #F5F5DC; margin-bottom: 12px; background-color: #3D0B37; object-fit: cover; display: inline-block; }
        .header h1 { font-family: Georgia, serif; font-size: 24px; font-style: italic; margin: 0; font-weight: normal; }
        .content { padding: 40px 30px; text-align: left; }
        .info-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        .info-table td { padding: 12px 0; border-bottom: 1px solid rgba(0,0,0,0.05); font-size: 14px; }
        .info-label { font-weight: bold; color: #3D0B37; width: 35%; }
        .info-value { color: #2A2A35; }
        .footer { padding: 20px; text-align: center; font-size: 11px; color: rgba(0,0,0,0.3); border-top: 1px solid rgba(0,0,0,0.05); }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <img src="https://printacote.com/Fichier%207.png" class="logo" alt="Printacoté" />
          <h1>Alertes Administrateur</h1>
        </div>
        <div class="content">
          <h2 style="color: #3D0B37; margin: 0 0 16px 0; font-weight: 800; font-size: 20px; text-align: center;">🔑 Réinitialisation de mot de passe</h2>
          <p style="color: #666; line-height: 1.6; font-size: 14px; text-align: center; margin-bottom: 24px;">
            Un utilisateur a demandé un code de récupération de mot de passe pour accéder à son compte professionnel.
          </p>
          <table class="info-table">
            <tr>
              <td class="info-label">Entreprise</td>
              <td class="info-value"><strong>' || v_printer_name || '</strong></td>
            </tr>
            <tr>
              <td class="info-label">Utilisateur</td>
              <td class="info-value">' || v_first_name || ' ' || v_last_name || '</td>
            </tr>
            <tr>
              <td class="info-label">Adresse Email</td>
              <td class="info-value">' || email_to || '</td>
            </tr>
            <tr>
              <td class="info-label">Date & Heure</td>
              <td class="info-value">' || v_senegal_time || '</td>
            </tr>
            <tr>
              <td class="info-label">Adresse IP</td>
              <td class="info-value">' || COALESCE(client_ip, 'Non renseignée') || '</td>
            </tr>
            <tr>
              <td class="info-label">Localisation</td>
              <td class="info-value">' || COALESCE(client_location, 'Non renseignée') || '</td>
            </tr>
            <tr>
              <td class="info-label">Appareil</td>
              <td class="info-value">' || COALESCE(client_device, 'Non renseigné') || '</td>
            </tr>
          </table>
        </div>
        <div class="footer">
          © 2026 Printacoté. Tous droits réservés.
        </div>
      </div>
    </body>
    </html>
  ';

  -- Call Resend API via pg_net (Admin notification email)
  PERFORM net.http_post(
    url := 'https://api.resend.com/emails',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_resend_api_key
    ),
    body := jsonb_build_object(
      'from', v_sender_email,
      'to', v_admin_email,
      'subject', '🔑 [Admin] Réinitialisation de mot de passe - ' || v_printer_name,
      'html', v_admin_email_body
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

