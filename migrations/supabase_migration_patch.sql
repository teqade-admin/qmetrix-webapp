-- Incremental patch for an already-provisioned QMetrix Supabase project.
-- Run this in the Supabase SQL editor after the original supabase_schema.sql.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_id_fkey'
      AND conrelid = 'public.users'::regclass
  ) THEN
    ALTER TABLE public.users DROP CONSTRAINT users_id_fkey;
  END IF;
END;
$$;

ALTER TABLE public.users
ADD CONSTRAINT users_id_fkey
FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS public.leave_requests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  employee_name TEXT NOT NULL,
  leave_type TEXT NOT NULL CHECK (leave_type IN ('annual', 'sick', 'maternity', 'paternity', 'unpaid', 'compassionate', 'study', 'other')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days_requested NUMERIC,
  reason TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  approved_by TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'resource_allocations_status_check'
      AND conrelid = 'public.resource_allocations'::regclass
  ) THEN
    ALTER TABLE public.resource_allocations DROP CONSTRAINT resource_allocations_status_check;
  END IF;
END;
$$;

ALTER TABLE public.resource_allocations
ADD CONSTRAINT resource_allocations_status_check
CHECK (status IN ('planned', 'active', 'inactive', 'completed'));

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'expenses_status_check'
      AND conrelid = 'public.expenses'::regclass
  ) THEN
    ALTER TABLE public.expenses DROP CONSTRAINT expenses_status_check;
  END IF;
END;
$$;

ALTER TABLE public.expenses
ADD CONSTRAINT expenses_status_check
CHECK (status IN ('pending', 'approved', 'rejected', 'reimbursed', 'paid'));

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'deliverables_overall_status_check'
      AND conrelid = 'public.deliverables'::regclass
  ) THEN
    ALTER TABLE public.deliverables DROP CONSTRAINT deliverables_overall_status_check;
  END IF;
END;
$$;

ALTER TABLE public.deliverables
ADD CONSTRAINT deliverables_overall_status_check
CHECK (overall_status IN ('not_started', 'in_progress', 'under_review', 'approved', 'rejected', 'issued'));

ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timesheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliverables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.employees TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leave_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.timesheets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.resource_allocations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bids TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.deliverables TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.milestones TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO authenticated;
GRANT SELECT ON public.roles TO authenticated;
GRANT SELECT ON public.permissions TO authenticated;
GRANT SELECT ON public.role_permissions TO authenticated;
GRANT SELECT ON public.user_roles TO authenticated;

DROP POLICY IF EXISTS "Authenticated users can view users" ON public.users;
CREATE POLICY "Authenticated users can view users" ON public.users
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert users" ON public.users;
DROP POLICY IF EXISTS "Authenticated users can update users" ON public.users;
DROP POLICY IF EXISTS "Authenticated users can delete users" ON public.users;
CREATE POLICY "Authenticated users can insert users" ON public.users
FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update users" ON public.users
FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete users" ON public.users
FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can view employees" ON public.employees;
CREATE POLICY "Authenticated users can view employees" ON public.employees
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert employees" ON public.employees;
DROP POLICY IF EXISTS "Authenticated users can update employees" ON public.employees;
DROP POLICY IF EXISTS "Authenticated users can delete employees" ON public.employees;
CREATE POLICY "Authenticated users can insert employees" ON public.employees
FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update employees" ON public.employees
FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete employees" ON public.employees
FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can view leave requests" ON public.leave_requests;
CREATE POLICY "Authenticated users can view leave requests" ON public.leave_requests
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can manage leave requests" ON public.leave_requests;
CREATE POLICY "Authenticated users can manage leave requests" ON public.leave_requests
FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can view roles" ON public.roles;
CREATE POLICY "Authenticated users can view roles" ON public.roles
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can view own role assignments" ON public.user_roles;
CREATE POLICY "Users can view own role assignments" ON public.user_roles
FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Authenticated users can view permissions" ON public.permissions;
CREATE POLICY "Authenticated users can view permissions" ON public.permissions
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can view role permissions" ON public.role_permissions;
CREATE POLICY "Authenticated users can view role permissions" ON public.role_permissions
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can view projects" ON public.projects;
CREATE POLICY "Authenticated users can view projects" ON public.projects
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert projects" ON public.projects;
DROP POLICY IF EXISTS "Authenticated users can update projects" ON public.projects;
DROP POLICY IF EXISTS "Authenticated users can delete projects" ON public.projects;
CREATE POLICY "Authenticated users can insert projects" ON public.projects
FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update projects" ON public.projects
FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete projects" ON public.projects
FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can view timesheets" ON public.timesheets;
CREATE POLICY "Authenticated users can view timesheets" ON public.timesheets
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert timesheets" ON public.timesheets;
DROP POLICY IF EXISTS "Authenticated users can update timesheets" ON public.timesheets;
DROP POLICY IF EXISTS "Authenticated users can delete timesheets" ON public.timesheets;
CREATE POLICY "Authenticated users can insert timesheets" ON public.timesheets
FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update timesheets" ON public.timesheets
FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete timesheets" ON public.timesheets
FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can view allocations" ON public.resource_allocations;
CREATE POLICY "Authenticated users can view allocations" ON public.resource_allocations
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert allocations" ON public.resource_allocations;
DROP POLICY IF EXISTS "Authenticated users can update allocations" ON public.resource_allocations;
DROP POLICY IF EXISTS "Authenticated users can delete allocations" ON public.resource_allocations;
CREATE POLICY "Authenticated users can insert allocations" ON public.resource_allocations
FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update allocations" ON public.resource_allocations
FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete allocations" ON public.resource_allocations
FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can view bids" ON public.bids;
CREATE POLICY "Authenticated users can view bids" ON public.bids
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert bids" ON public.bids;
DROP POLICY IF EXISTS "Authenticated users can update bids" ON public.bids;
DROP POLICY IF EXISTS "Authenticated users can delete bids" ON public.bids;
CREATE POLICY "Authenticated users can insert bids" ON public.bids
FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update bids" ON public.bids
FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete bids" ON public.bids
FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can view invoices" ON public.invoices;
CREATE POLICY "Authenticated users can view invoices" ON public.invoices
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert invoices" ON public.invoices;
DROP POLICY IF EXISTS "Authenticated users can update invoices" ON public.invoices;
DROP POLICY IF EXISTS "Authenticated users can delete invoices" ON public.invoices;
CREATE POLICY "Authenticated users can insert invoices" ON public.invoices
FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update invoices" ON public.invoices
FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete invoices" ON public.invoices
FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can view expenses" ON public.expenses;
CREATE POLICY "Authenticated users can view expenses" ON public.expenses
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert expenses" ON public.expenses;
DROP POLICY IF EXISTS "Authenticated users can update expenses" ON public.expenses;
DROP POLICY IF EXISTS "Authenticated users can delete expenses" ON public.expenses;
CREATE POLICY "Authenticated users can insert expenses" ON public.expenses
FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update expenses" ON public.expenses
FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete expenses" ON public.expenses
FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can view deliverables" ON public.deliverables;
CREATE POLICY "Authenticated users can view deliverables" ON public.deliverables
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert deliverables" ON public.deliverables;
DROP POLICY IF EXISTS "Authenticated users can update deliverables" ON public.deliverables;
DROP POLICY IF EXISTS "Authenticated users can delete deliverables" ON public.deliverables;
CREATE POLICY "Authenticated users can insert deliverables" ON public.deliverables
FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update deliverables" ON public.deliverables
FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete deliverables" ON public.deliverables
FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can view milestones" ON public.milestones;
CREATE POLICY "Authenticated users can view milestones" ON public.milestones
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert milestones" ON public.milestones;
DROP POLICY IF EXISTS "Authenticated users can update milestones" ON public.milestones;
DROP POLICY IF EXISTS "Authenticated users can delete milestones" ON public.milestones;
CREATE POLICY "Authenticated users can insert milestones" ON public.milestones
FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update milestones" ON public.milestones
FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete milestones" ON public.milestones
FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can view documents" ON public.documents;
CREATE POLICY "Authenticated users can view documents" ON public.documents
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert documents" ON public.documents;
DROP POLICY IF EXISTS "Authenticated users can update documents" ON public.documents;
DROP POLICY IF EXISTS "Authenticated users can delete documents" ON public.documents;
CREATE POLICY "Authenticated users can insert documents" ON public.documents
FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update documents" ON public.documents
FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete documents" ON public.documents
FOR DELETE TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.bootstrap_admin_account(p_full_name TEXT DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  current_user_email TEXT;
  admin_role_id UUID;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT email INTO current_user_email
  FROM auth.users
  WHERE id = current_user_id;

  IF current_user_email IS NULL THEN
    RAISE EXCEPTION 'Authenticated user not found';
  END IF;

  INSERT INTO public.users (id, email, full_name)
  VALUES (current_user_id, current_user_email, COALESCE(p_full_name, current_user_email))
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      full_name = COALESCE(EXCLUDED.full_name, public.users.full_name),
      updated_at = NOW();

  INSERT INTO public.employees (
    user_id,
    full_name,
    email,
    department,
    role,
    app_role,
    status,
    start_date
  )
  SELECT
    current_user_id,
    COALESCE(p_full_name, current_user_email),
    current_user_email,
    'executive',
    'director',
    'admin',
    'active',
    CURRENT_DATE
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.employees
    WHERE user_id = current_user_id OR email = current_user_email
  );

  SELECT id INTO admin_role_id
  FROM public.roles
  WHERE name = 'admin'
  LIMIT 1;

  IF admin_role_id IS NULL THEN
    INSERT INTO public.roles (name, description)
    VALUES ('admin', 'Full system access')
    ON CONFLICT (name) DO NOTHING;

    SELECT id INTO admin_role_id
    FROM public.roles
    WHERE name = 'admin'
    LIMIT 1;
  END IF;

  INSERT INTO public.user_roles (user_id, role_id, assigned_by)
  VALUES (current_user_id, admin_role_id, current_user_id)
  ON CONFLICT (user_id, role_id) DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION public.bootstrap_admin_account(TEXT) TO authenticated;

DROP TRIGGER IF EXISTS trg_users_set_updated_at ON public.users;
CREATE TRIGGER trg_users_set_updated_at
BEFORE UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_employees_set_updated_at ON public.employees;
CREATE TRIGGER trg_employees_set_updated_at
BEFORE UPDATE ON public.employees
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_leave_requests_set_updated_at ON public.leave_requests;
CREATE TRIGGER trg_leave_requests_set_updated_at
BEFORE UPDATE ON public.leave_requests
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_projects_set_updated_at ON public.projects;
CREATE TRIGGER trg_projects_set_updated_at
BEFORE UPDATE ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_timesheets_set_updated_at ON public.timesheets;
CREATE TRIGGER trg_timesheets_set_updated_at
BEFORE UPDATE ON public.timesheets
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_resource_allocations_set_updated_at ON public.resource_allocations;
CREATE TRIGGER trg_resource_allocations_set_updated_at
BEFORE UPDATE ON public.resource_allocations
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_bids_set_updated_at ON public.bids;
CREATE TRIGGER trg_bids_set_updated_at
BEFORE UPDATE ON public.bids
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_invoices_set_updated_at ON public.invoices;
CREATE TRIGGER trg_invoices_set_updated_at
BEFORE UPDATE ON public.invoices
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_expenses_set_updated_at ON public.expenses;
CREATE TRIGGER trg_expenses_set_updated_at
BEFORE UPDATE ON public.expenses
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_deliverables_set_updated_at ON public.deliverables;
CREATE TRIGGER trg_deliverables_set_updated_at
BEFORE UPDATE ON public.deliverables
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_milestones_set_updated_at ON public.milestones;
CREATE TRIGGER trg_milestones_set_updated_at
BEFORE UPDATE ON public.milestones
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_documents_set_updated_at ON public.documents;
CREATE TRIGGER trg_documents_set_updated_at
BEFORE UPDATE ON public.documents
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Authenticated users can upload document objects" ON storage.objects;
CREATE POLICY "Authenticated users can upload document objects" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'documents');

DROP POLICY IF EXISTS "Authenticated users can read document objects" ON storage.objects;
CREATE POLICY "Authenticated users can read document objects" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'documents');

DROP POLICY IF EXISTS "Authenticated users can update document objects" ON storage.objects;
CREATE POLICY "Authenticated users can update document objects" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'documents')
WITH CHECK (bucket_id = 'documents');

DROP POLICY IF EXISTS "Authenticated users can delete document objects" ON storage.objects;
CREATE POLICY "Authenticated users can delete document objects" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'documents');

CREATE INDEX IF NOT EXISTS idx_leave_requests_employee_id ON public.leave_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON public.leave_requests(status);
