-- Work sections become a first-class, assignable record.
--
-- They lived as a JSONB array inside projects.work_sections, which meant they
-- had no stable identity: nothing could be assigned to a person, reported by
-- another, or referenced from a timesheet. Promote them to a table, carry the
-- existing rows across, and link timesheets to them.
--
-- projects.work_sections is left in place, untouched, as a fallback until the
-- UI has fully moved over. It is no longer read.
--
-- Idempotent — safe to re-run.

CREATE TABLE IF NOT EXISTS public.work_sections (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  riba_stage TEXT CHECK (riba_stage IN ('stage_0','stage_1','stage_2','stage_3','stage_4','stage_5','stage_6','stage_7')),

  -- Who does the work, and who raised it. Names are denormalised so the record
  -- stays readable if someone leaves, matching how OCRA owners are stored.
  assignee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  assignee_name TEXT,
  reporter_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  reporter_name TEXT,

  status TEXT NOT NULL DEFAULT 'todo'
    CHECK (status IN ('todo', 'in_progress', 'blocked', 'completed')),
  progress_percent NUMERIC DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),

  planned_hours NUMERIC,   -- total hours the work is expected to take
  work_date DATE,          -- when the work is due to happen
  start_date DATE,
  end_date DATE,
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS work_sections_project_idx ON public.work_sections (project_id);
CREATE INDEX IF NOT EXISTS work_sections_assignee_idx ON public.work_sections (assignee_id);
CREATE INDEX IF NOT EXISTS work_sections_stage_idx ON public.work_sections (riba_stage);

-- Timesheets can now book hours against a specific package of work rather than
-- only a project. Nullable: ad-hoc time still gets logged without one.
ALTER TABLE public.timesheets
  ADD COLUMN IF NOT EXISTS work_section_id UUID REFERENCES public.work_sections(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS timesheets_work_section_idx ON public.timesheets (work_section_id);

-- Carry across whatever is already stored in the JSONB column. Runs once:
-- a section already migrated (same project + title) is skipped, so re-running
-- never duplicates.
DO $$
DECLARE
  moved INT := 0;
BEGIN
  INSERT INTO public.work_sections (
    project_id, title, riba_stage, assignee_name, status,
    progress_percent, start_date, end_date, notes
  )
  SELECT
    p.id,
    COALESCE(NULLIF(s->>'title', ''), 'Untitled section'),
    NULLIF(s->>'riba_stage', ''),
    NULLIF(s->>'assigned_to', ''),
    CASE
      WHEN COALESCE((s->>'progress_percent')::numeric, 0) >= 100 THEN 'completed'
      WHEN s->>'status' = 'in_progress' THEN 'in_progress'
      WHEN s->>'status' = 'on_hold' THEN 'blocked'
      WHEN s->>'status' = 'completed' THEN 'completed'
      ELSE 'todo'
    END,
    COALESCE((s->>'progress_percent')::numeric, 0),
    NULLIF(s->>'start_date', '')::date,
    NULLIF(s->>'end_date', '')::date,
    NULLIF(s->>'notes', '')
  FROM public.projects p
  CROSS JOIN LATERAL jsonb_array_elements(
    CASE WHEN jsonb_typeof(p.work_sections) = 'array' THEN p.work_sections ELSE '[]'::jsonb END
  ) AS s
  WHERE NOT EXISTS (
    SELECT 1 FROM public.work_sections w
     WHERE w.project_id = p.id
       AND w.title = COALESCE(NULLIF(s->>'title', ''), 'Untitled section')
  );

  GET DIAGNOSTICS moved = ROW_COUNT;
  RAISE NOTICE 'Migrated % work section(s) out of JSONB', moved;
END $$;

-- Resolve the free-text assignee names onto real employees where they match.
UPDATE public.work_sections w
   SET assignee_id = e.id
  FROM public.employees e
 WHERE w.assignee_id IS NULL
   AND w.assignee_name IS NOT NULL
   AND btrim(lower(e.full_name)) = btrim(lower(w.assignee_name));

ALTER TABLE public.work_sections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read work sections" ON public.work_sections;
CREATE POLICY "Authenticated users can read work sections"
  ON public.work_sections FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can write work sections" ON public.work_sections;
CREATE POLICY "Authenticated users can write work sections"
  ON public.work_sections FOR ALL TO authenticated USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_sections TO authenticated;
