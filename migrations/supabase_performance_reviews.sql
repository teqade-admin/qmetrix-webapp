-- Performance reviews + KPI scorecard config for QMetrix.
-- Run in the Supabase SQL editor after supabase_schema.sql + supabase_branding.sql. Idempotent.

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- KPI scorecard targets/weights live in the single app_settings row.
ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS kpi_config JSONB DEFAULT '{}'::jsonb;

-- One saved review per employee per period: a snapshot of the computed metrics
-- plus the manager's rating, comments and objectives.
CREATE TABLE IF NOT EXISTS public.performance_reviews (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
  employee_name TEXT,
  period_label TEXT NOT NULL,
  period_start DATE,
  period_end DATE,
  utilisation NUMERIC,
  billable_hours NUMERIC,
  non_billable_hours NUMERIC,
  revenue NUMERIC,
  kpi_score NUMERIC,
  rating TEXT CHECK (rating IS NULL OR rating IN ('exceptional','exceeds_expectations','meets_expectations','needs_improvement','unsatisfactory')),
  comments TEXT,
  objectives TEXT,
  reviewed_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (employee_id, period_label)
);

CREATE INDEX IF NOT EXISTS idx_perf_reviews_employee ON public.performance_reviews(employee_id);

DROP TRIGGER IF EXISTS set_perf_reviews_updated_at ON public.performance_reviews;
CREATE TRIGGER set_perf_reviews_updated_at
BEFORE UPDATE ON public.performance_reviews
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.performance_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read performance reviews" ON public.performance_reviews;
CREATE POLICY "Authenticated can read performance reviews" ON public.performance_reviews
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated can write performance reviews" ON public.performance_reviews;
CREATE POLICY "Authenticated can write performance reviews" ON public.performance_reviews
FOR ALL TO authenticated USING (true) WITH CHECK (true);
