-- HR onboarding checklist + KPI/goals patch for QMetrix.
-- Run in the Supabase SQL editor after supabase_schema.sql. Idempotent.

-- Per-stage onboarding checklist (document collection, contract upload, etc.).
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS onboarding_checklist JSONB DEFAULT '{}'::jsonb;

-- KPI target (0-100) and free-text goals for the Goals & KPI Setting tab.
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS kpi_target NUMERIC CHECK (kpi_target IS NULL OR (kpi_target >= 0 AND kpi_target <= 100));
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS goals TEXT;
