-- Project ownership, and discussion on a work section.
--
-- Who created a project decides who may delete it, so it has to be recorded
-- rather than inferred. created_at already exists on projects; created_by does
-- not, and cannot be backfilled reliably — existing rows are left NULL and
-- treated as "no owner", which the UI falls back to the project manager for.
--
-- Idempotent — safe to re-run.

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_by_name TEXT;

CREATE INDEX IF NOT EXISTS projects_created_by_idx ON public.projects (created_by);

-- Discussion against a piece of work. Kept separate from the section itself so
-- a comment is its own record with its own author and time, and so the audit
-- trigger logs each one individually.
CREATE TABLE IF NOT EXISTS public.work_section_comments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  work_section_id UUID NOT NULL REFERENCES public.work_sections(id) ON DELETE CASCADE,
  author_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  author_name TEXT,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS work_section_comments_section_idx
  ON public.work_section_comments (work_section_id, created_at DESC);

ALTER TABLE public.work_section_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read work section comments" ON public.work_section_comments;
CREATE POLICY "Authenticated users can read work section comments"
  ON public.work_section_comments FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can write work section comments" ON public.work_section_comments;
CREATE POLICY "Authenticated users can write work section comments"
  ON public.work_section_comments FOR ALL TO authenticated USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_section_comments TO authenticated;

-- The audit trigger is attached per table, so a table created after that
-- migration ran needs wiring up. Only attaches if the function is there.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'record_audit_log') THEN
    DROP TRIGGER IF EXISTS audit_work_section_comments ON public.work_section_comments;
    CREATE TRIGGER audit_work_section_comments
      AFTER INSERT OR UPDATE OR DELETE ON public.work_section_comments
      FOR EACH ROW EXECUTE FUNCTION public.record_audit_log();
    RAISE NOTICE 'Audit trigger attached to work_section_comments';
  ELSE
    RAISE NOTICE 'record_audit_log not found — run supabase_audit_log.sql to capture comments';
  END IF;
END $$;
