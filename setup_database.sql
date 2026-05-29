-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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
    options JSONB -- Advanced options like quantity, quality, etc.
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
    status
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
    'Désactivé'
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

