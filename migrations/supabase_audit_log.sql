-- Audit log: who changed what, when, and what the change was.
--
-- Capture happens in the database, not the app. A trigger sees every write
-- regardless of which screen (or client) made it, records the actor from the
-- request's JWT, and diffs OLD against NEW so the log holds the actual field
-- changes rather than a description of them.
--
-- Actor identity is denormalised onto each row: an audit trail has to stay
-- readable after someone is renamed or removed.
--
-- Idempotent — safe to re-run.

-- The base schema (supabase_schema.sql) already ships an unused audit_logs
-- table with a different shape — user_id/resource/old_values/new_values/
-- timestamp. So this cannot be a plain CREATE TABLE: on an existing database
-- "IF NOT EXISTS" skips it and everything after fails on the missing columns.
-- Add what's missing instead, and leave the legacy columns alone.
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY
);

ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS actor_user_id UUID,
  ADD COLUMN IF NOT EXISTS actor_employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS actor_name TEXT,
  ADD COLUMN IF NOT EXISTS module TEXT,
  ADD COLUMN IF NOT EXISTS table_name TEXT,
  ADD COLUMN IF NOT EXISTS record_id UUID,
  ADD COLUMN IF NOT EXISTS record_label TEXT,
  ADD COLUMN IF NOT EXISTS action TEXT,
  ADD COLUMN IF NOT EXISTS changes JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Legacy columns this feature never populates must not block inserts.
DO $$
DECLARE
  c TEXT;
BEGIN
  FOREACH c IN ARRAY ARRAY['resource', 'resource_id', 'old_values', 'new_values', 'user_id', 'timestamp']
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = 'audit_logs' AND column_name = c) THEN
      EXECUTE format('ALTER TABLE public.audit_logs ALTER COLUMN %I DROP NOT NULL', c);
    END IF;
  END LOOP;
END $$;

-- Constrain the action, but only if nothing already stored would violate it.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.audit_logs
     WHERE action IS NOT NULL AND action NOT IN ('create', 'update', 'delete')
  ) THEN
    ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_action_check;
    ALTER TABLE public.audit_logs
      ADD CONSTRAINT audit_logs_action_check CHECK (action IN ('create', 'update', 'delete'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS audit_logs_occurred_at_idx ON public.audit_logs (occurred_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_actor_idx ON public.audit_logs (actor_employee_id);
CREATE INDEX IF NOT EXISTS audit_logs_module_idx ON public.audit_logs (module);

CREATE OR REPLACE FUNCTION public.record_audit_log() RETURNS TRIGGER AS $$
DECLARE
  v_old JSONB;
  v_new JSONB;
  v_row JSONB;
  v_changes JSONB := '{}'::jsonb;
  v_key TEXT;
  v_actor_user UUID;
  v_actor_emp UUID;
  v_actor_name TEXT;
  v_email TEXT;
  v_action TEXT;
BEGIN
  v_actor_user := auth.uid();

  BEGIN
    v_email := current_setting('request.jwt.claims', true)::jsonb ->> 'email';
  EXCEPTION WHEN OTHERS THEN
    v_email := NULL;
  END;

  SELECT e.id, e.full_name INTO v_actor_emp, v_actor_name
    FROM public.employees e
   WHERE (v_actor_user IS NOT NULL AND e.user_id = v_actor_user)
      OR (v_email IS NOT NULL AND lower(e.email) = lower(v_email))
   LIMIT 1;

  IF TG_OP = 'INSERT' THEN
    v_action := 'create';
    v_row := to_jsonb(NEW);
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'update';
    v_row := to_jsonb(NEW);
    v_old := to_jsonb(OLD);
    v_new := to_jsonb(NEW);
    FOR v_key IN SELECT jsonb_object_keys(v_new) LOOP
      IF v_key NOT IN ('updated_at', 'created_at')
         AND (v_old -> v_key) IS DISTINCT FROM (v_new -> v_key) THEN
        v_changes := v_changes || jsonb_build_object(
          v_key, jsonb_build_object('from', v_old -> v_key, 'to', v_new -> v_key)
        );
      END IF;
    END LOOP;
    -- A write that changed nothing is noise, not an audit event.
    IF v_changes = '{}'::jsonb THEN
      RETURN NULL;
    END IF;
  ELSE
    v_action := 'delete';
    v_row := to_jsonb(OLD);
  END IF;

  INSERT INTO public.audit_logs (
    actor_user_id, actor_employee_id, actor_name,
    module, table_name, record_id, record_label, action, changes
  ) VALUES (
    v_actor_user,
    v_actor_emp,
    COALESCE(v_actor_name, v_email, 'Unknown'),
    CASE TG_TABLE_NAME
      WHEN 'employees'            THEN 'Employment'
      WHEN 'projects'             THEN 'Projects'
      WHEN 'invoices'             THEN 'Finance'
      WHEN 'expenses'             THEN 'Finance'
      WHEN 'deliverables'         THEN 'Deliverables'
      WHEN 'timesheets'           THEN 'Time Management'
      WHEN 'leave_requests'       THEN 'Time Management'
      WHEN 'milestones'           THEN 'Workflow'
      WHEN 'resource_allocations' THEN 'Resource Allocation'
      WHEN 'bids'                 THEN 'Bid Management'
      WHEN 'clients'              THEN 'Bid Management'
      WHEN 'documents'            THEN 'Data Management'
      WHEN 'performance_reviews'  THEN 'KPI & Performance'
      WHEN 'app_settings'         THEN 'Settings'
      ELSE TG_TABLE_NAME
    END,
    TG_TABLE_NAME,
    NULLIF(v_row ->> 'id', '')::uuid,
    COALESCE(
      NULLIF(v_row ->> 'full_name', ''),
      NULLIF(v_row ->> 'name', ''),
      NULLIF(v_row ->> 'title', ''),
      NULLIF(v_row ->> 'invoice_number', ''),
      NULLIF(v_row ->> 'employee_name', ''),
      NULLIF(v_row ->> 'description', ''),
      NULLIF(v_row ->> 'project_name', ''),
      NULLIF(v_row ->> 'company_name', ''),
      ''
    ),
    v_action,
    v_changes
  );

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach to every table worth auditing.
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'employees', 'projects', 'invoices', 'expenses', 'deliverables',
    'timesheets', 'leave_requests', 'milestones', 'resource_allocations',
    'bids', 'clients', 'documents', 'performance_reviews', 'app_settings'
  ]
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables
                WHERE table_schema = 'public' AND table_name = t) THEN
      EXECUTE format('DROP TRIGGER IF EXISTS audit_%1$s ON public.%1$I', t);
      EXECUTE format(
        'CREATE TRIGGER audit_%1$s AFTER INSERT OR UPDATE OR DELETE ON public.%1$I
           FOR EACH ROW EXECUTE FUNCTION public.record_audit_log()', t
      );
    END IF;
  END LOOP;
END $$;

-- The log is append-only from the application's point of view.
REVOKE UPDATE, DELETE ON public.audit_logs FROM anon, authenticated;
GRANT SELECT ON public.audit_logs TO anon, authenticated;

-- RLS is enabled on this table by the base schema, but its SELECT policy was
-- never applied — so the trigger (SECURITY DEFINER, which bypasses RLS) kept
-- writing rows that no signed-in user could read, and the page looked empty.
-- A GRANT alone is not enough once RLS is on: a policy has to allow the read.
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view audit logs" ON public.audit_logs;
CREATE POLICY "Authenticated users can view audit logs"
  ON public.audit_logs FOR SELECT TO authenticated USING (true);

-- No INSERT/UPDATE/DELETE policies: writes arrive only through the trigger,
-- and the absence of a policy is what keeps the log append-only.
