-- ============================================================
-- CasaFin — Supabase Schema
-- Führe dies im Supabase SQL Editor aus
-- ============================================================

-- 1. Verschlüsselte User-Daten (Vault Blobs)
-- User können nur ihre eigenen Daten lesen/schreiben (RLS)
CREATE TABLE IF NOT EXISTS casafin_vault_blobs (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  encrypted_blob TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id)
);

-- RLS aktivieren: User sieht nur eigene Daten
ALTER TABLE casafin_vault_blobs ENABLE ROW LEVEL SECURITY;

-- Policy: User kann nur seine eigenen vault_blobs lesen
CREATE POLICY "user_own_vault_read"
  ON casafin_vault_blobs FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: User kann nur seine eigenen vault_blobs schreiben (INSERT)
CREATE POLICY "user_own_vault_insert"
  ON casafin_vault_blobs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: User kann nur seine eigenen vault_blobs aktualisieren (UPDATE)
CREATE POLICY "user_own_vault_update"
  ON casafin_vault_blobs FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 2. Stripe Events (Zahlungstracking)
-- Nur Server (Service Role) kann hier schreiben
CREATE TABLE IF NOT EXISTS casafin_stripe_events (
  id SERIAL PRIMARY KEY,
  event_id TEXT UNIQUE,
  event_type TEXT,
  customer_email TEXT,
  plan TEXT,
  amount_total BIGINT,
  status TEXT,
  processed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: User können stripe_events NICHT lesen (nur Service Role)
ALTER TABLE casafin_stripe_events ENABLE ROW LEVEL SECURITY;

-- 3. User Profiles (Plan, Status)
CREATE TABLE IF NOT EXISTS casafin_profiles (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  plan TEXT DEFAULT 'free',
  stripe_customer_id TEXT,
  subscription_status TEXT DEFAULT 'inactive',
  current_period_end TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id)
);

-- RLS: User kann nur eigenes Profil lesen
ALTER TABLE casafin_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_own_profile_read"
  ON casafin_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "user_own_profile_insert"
  ON casafin_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_own_profile_update"
  ON casafin_profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- Nach dem Ausführen:
-- 1. Gehe zu Authentication → URL Configuration
-- 2. Site URL: https://casafin.ch
-- 3. Redirect URLs: https://casafin.ch/**, https://casafin.ch/CasaFin.html
-- 4. Email Templates → Magic Link → "CasaFin" branding anpassen
-- ============================================================