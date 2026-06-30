-- Branding / app settings patch for QMetrix.
-- Adds a single-row app_settings table (logo + company name) and a public
-- "branding" storage bucket for the logo image.
-- Run in the Supabase SQL editor after supabase_schema.sql. Idempotent.

-- Shared updated_at trigger function (no-op if it already exists).
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. Single-row settings table. The boolean PK + CHECK enforces exactly one row.
CREATE TABLE IF NOT EXISTS public.app_settings (
  id BOOLEAN PRIMARY KEY DEFAULT true,
  logo_url TEXT,
  company_name TEXT DEFAULT 'QMetrix',
  company_subtitle TEXT DEFAULT 'Operations Suite',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT app_settings_singleton CHECK (id)
);

INSERT INTO public.app_settings (id) VALUES (true) ON CONFLICT (id) DO NOTHING;

DROP TRIGGER IF EXISTS set_app_settings_updated_at ON public.app_settings;
CREATE TRIGGER set_app_settings_updated_at
BEFORE UPDATE ON public.app_settings
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. RLS: every signed-in user can read branding; updates are UI-gated to admins
--    (consistent with the app's current broad authenticated RLS model).
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read app settings" ON public.app_settings;
CREATE POLICY "Authenticated can read app settings" ON public.app_settings
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated can update app settings" ON public.app_settings;
CREATE POLICY "Authenticated can update app settings" ON public.app_settings
FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- 3. Public "branding" storage bucket for the logo image.
INSERT INTO storage.buckets (id, name, public)
VALUES ('branding', 'branding', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Authenticated can upload branding objects" ON storage.objects;
CREATE POLICY "Authenticated can upload branding objects" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'branding');

DROP POLICY IF EXISTS "Public can read branding objects" ON storage.objects;
CREATE POLICY "Public can read branding objects" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'branding');

DROP POLICY IF EXISTS "Authenticated can update branding objects" ON storage.objects;
CREATE POLICY "Authenticated can update branding objects" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'branding')
WITH CHECK (bucket_id = 'branding');

DROP POLICY IF EXISTS "Authenticated can delete branding objects" ON storage.objects;
CREATE POLICY "Authenticated can delete branding objects" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'branding');
