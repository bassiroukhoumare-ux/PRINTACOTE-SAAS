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
    views INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
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
