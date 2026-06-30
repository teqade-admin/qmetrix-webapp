-- Clients database patch for QMetrix.
-- Adds a proper clients table (full client profile) and links bids to a client.
-- Run in the Supabase SQL editor after supabase_schema.sql. Idempotent.

-- Shared updated_at trigger function (no-op if it already exists).
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. Clients table.
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  company_name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  sector TEXT CHECK (sector IN ('residential', 'commercial', 'infrastructure', 'healthcare', 'education', 'industrial', 'mixed_use', 'government', 'other')),
  address TEXT,
  website TEXT,
  notes TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'prospect', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clients_company_name ON public.clients(company_name);

DROP TRIGGER IF EXISTS set_clients_updated_at ON public.clients;
CREATE TRIGGER set_clients_updated_at
BEFORE UPDATE ON public.clients
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read clients" ON public.clients;
CREATE POLICY "Authenticated can read clients" ON public.clients
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated can write clients" ON public.clients;
CREATE POLICY "Authenticated can write clients" ON public.clients
FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 2. Link bids to a client and capture a bid-specific contact phone.
ALTER TABLE public.bids
  ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL;
ALTER TABLE public.bids
  ADD COLUMN IF NOT EXISTS client_phone TEXT;

CREATE INDEX IF NOT EXISTS idx_bids_client_id ON public.bids(client_id);

-- 3. Backfill clients from existing bids (one client per distinct client_name).
INSERT INTO public.clients (company_name, contact_person, email, sector)
SELECT DISTINCT ON (b.client_name)
  b.client_name, b.client_contact, b.client_email, b.sector
FROM public.bids b
WHERE b.client_name IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.clients c WHERE c.company_name = b.client_name)
ORDER BY b.client_name, b.created_at;

-- Point existing bids at their matching client.
UPDATE public.bids b
SET client_id = c.id
FROM public.clients c
WHERE b.client_id IS NULL AND b.client_name = c.company_name;
