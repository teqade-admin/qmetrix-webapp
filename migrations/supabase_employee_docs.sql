-- Employee onboarding data patch for QMetrix.
-- Captures the data behind the onboarding checklist: a downloadable contract,
-- collected documents, and project allocation.
-- Run in the Supabase SQL editor after supabase_hr_kpi.sql. Idempotent.

ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS contract_url TEXT;

-- [{ "name": "...", "url": "..." }, ...]
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS documents JSONB DEFAULT '[]'::jsonb;

-- Array of allocated project names.
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS allocated_projects JSONB DEFAULT '[]'::jsonb;
