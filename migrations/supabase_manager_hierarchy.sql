-- Manager hierarchy patch for QMetrix.
-- Adds a stable self-referencing manager_id to employees so a manager can
-- themselves report to another manager (multi-level reporting line).
-- Run in the Supabase SQL editor after supabase_schema.sql. Idempotent.

-- 1. Add the manager_id column (FK to another employee).
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES public.employees(id) ON DELETE SET NULL;

-- 2. Backfill manager_id from the legacy manager_name text field where the
--    name resolves to exactly one employee (ambiguous names are left null).
UPDATE public.employees e
SET manager_id = m.id
FROM public.employees m
WHERE e.manager_id IS NULL
  AND e.manager_name IS NOT NULL
  AND e.manager_name = m.full_name
  AND m.id <> e.id
  AND (
    SELECT count(*) FROM public.employees x WHERE x.full_name = e.manager_name
  ) = 1;

-- 3. Index for fast "direct reports" lookups.
CREATE INDEX IF NOT EXISTS employees_manager_id_idx ON public.employees(manager_id);

-- 4. Guard against an employee being their own manager.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'employees_manager_not_self'
  ) THEN
    ALTER TABLE public.employees
      ADD CONSTRAINT employees_manager_not_self CHECK (manager_id IS NULL OR manager_id <> id);
  END IF;
END;
$$;
