-- Deliverables: tie each OCRA role to an employee record, not a name string.
--
-- originator/checker/reviewer/authoriser were free-text names, so there was no
-- reliable way to tell whether the signed-in user is the person a step belongs
-- to. Add an id column per role (FK to employees) and backfill it by matching
-- the existing name. The name columns stay for display and history.
--
-- ON DELETE SET NULL: removing an employee must not delete delivery records; the
-- step simply becomes unassigned and has to be reassigned.
--
-- Idempotent — safe to re-run.

ALTER TABLE public.deliverables
  ADD COLUMN IF NOT EXISTS originator_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS checker_id    UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewer_id   UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS authoriser_id UUID REFERENCES public.employees(id) ON DELETE SET NULL;

-- Backfill from the existing names. Only fills blanks, so re-running never
-- overwrites an assignment made through the UI. Ambiguous names (two employees
-- sharing a full name) are left NULL rather than guessed at.
DO $$
DECLARE
  role_name TEXT;
BEGIN
  FOREACH role_name IN ARRAY ARRAY['originator', 'checker', 'reviewer', 'authoriser']
  LOOP
    EXECUTE format($f$
      UPDATE public.deliverables d
         SET %1$s_id = e.id
        FROM public.employees e
       WHERE d.%1$s_id IS NULL
         AND d.%1$s IS NOT NULL
         AND btrim(d.%1$s) = btrim(e.full_name)
         AND (SELECT count(*) FROM public.employees x
               WHERE btrim(x.full_name) = btrim(d.%1$s)) = 1
    $f$, role_name);
  END LOOP;
END $$;

-- Report anything the backfill could not resolve; these need reassigning in the UI.
DO $$
DECLARE
  leftover INT;
BEGIN
  SELECT count(*) INTO leftover
    FROM public.deliverables
   WHERE (originator IS NOT NULL AND originator_id IS NULL)
      OR (checker    IS NOT NULL AND checker_id    IS NULL)
      OR (reviewer   IS NOT NULL AND reviewer_id   IS NULL)
      OR (authoriser IS NOT NULL AND authoriser_id IS NULL);
  RAISE NOTICE 'Deliverables with an unmatched OCRA name: %', leftover;
END $$;
