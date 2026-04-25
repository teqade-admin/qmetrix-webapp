-- Supabase SQL to create tables for QMetrix App

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Roles table
CREATE TABLE IF NOT EXISTS public.roles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Permissions table
CREATE TABLE IF NOT EXISTS public.permissions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  resource TEXT NOT NULL,
  action TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(resource, action)
);

-- Role permissions
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id UUID REFERENCES public.permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(role_id, permission_id)
);

-- User roles
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES public.users(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, role_id)
);

-- Employees table
CREATE TABLE IF NOT EXISTS public.employees (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id),
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  department TEXT CHECK (department IN ('cost_management', 'quantity_surveying', 'project_management', 'commercial', 'finance', 'administration', 'executive')),
  job_title TEXT,
  role TEXT CHECK (role IN ('director', 'associate_director', 'senior_consultant', 'consultant', 'junior_consultant', 'analyst', 'administrator')),
  app_role TEXT DEFAULT 'qs' CHECK (app_role IN ('admin', 'hr', 'qs', 'billing', 'project_manager', 'finance', 'reviewer', 'approver')),
  hourly_rate NUMERIC,
  cost_rate NUMERIC,
  salary NUMERIC,
  skills JSONB DEFAULT '[]',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'on_leave', 'terminated')),
  start_date DATE,
  onboarding_status TEXT DEFAULT 'not_started' CHECK (onboarding_status IN ('not_started', 'in_progress', 'completed')),
  kpi_score NUMERIC CHECK (kpi_score >= 0 AND kpi_score <= 100),
  performance_rating TEXT CHECK (performance_rating IN ('exceptional', 'exceeds_expectations', 'meets_expectations', 'needs_improvement', 'unsatisfactory')),
  manager_name TEXT,
  avatar_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Leave requests table
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

-- Projects table
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  project_code TEXT,
  client_name TEXT,
  description TEXT,
  sector TEXT CHECK (sector IN ('residential', 'commercial', 'infrastructure', 'healthcare', 'education', 'industrial', 'mixed_use', 'government', 'other')),
  project_value NUMERIC,
  fee_agreed NUMERIC,
  fee_invoiced NUMERIC,
  cost_to_date NUMERIC,
  earned_value NUMERIC,
  riba_stage TEXT CHECK (riba_stage IN ('stage_0', 'stage_1', 'stage_2', 'stage_3', 'stage_4', 'stage_5', 'stage_6', 'stage_7')),
  status TEXT CHECK (status IN ('kick_off', 'feasibility', 'design', 'pre_construction', 'construction', 'post_completion', 'closed')),
  project_manager TEXT,
  start_date DATE,
  end_date DATE,
  baseline_start_date DATE,
  baseline_end_date DATE,
  actual_start_date DATE,
  actual_end_date DATE,
  progress_percent NUMERIC CHECK (progress_percent >= 0 AND progress_percent <= 100),
  budgeted_hours NUMERIC,
  actual_hours NUMERIC,
  work_sections JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Timesheets table
CREATE TABLE IF NOT EXISTS public.timesheets (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  employee_name TEXT NOT NULL,
  project_name TEXT NOT NULL,
  date DATE NOT NULL,
  hours NUMERIC NOT NULL,
  task_description TEXT,
  riba_stage TEXT CHECK (riba_stage IN ('pre_concept', 'concept', 'schematic', 'detailed_design', 'boq_preparation', 'construction', 'post_completion', 'general')),
  billable BOOLEAN DEFAULT TRUE,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')),
  week_ending DATE,
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Resource allocations table
CREATE TABLE IF NOT EXISTS public.resource_allocations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  employee_name TEXT NOT NULL,
  project_name TEXT NOT NULL,
  role_on_project TEXT,
  allocation_percent NUMERIC CHECK (allocation_percent >= 0 AND allocation_percent <= 200),
  hours_budgeted NUMERIC,
  hours_spent NUMERIC,
  start_date DATE,
  end_date DATE,
  riba_stage TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('planned', 'active', 'inactive', 'completed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bids table
CREATE TABLE IF NOT EXISTS public.bids (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  client_name TEXT NOT NULL,
  client_contact TEXT,
  client_email TEXT,
  description TEXT,
  sector TEXT CHECK (sector IN ('residential', 'commercial', 'infrastructure', 'healthcare', 'education', 'industrial', 'mixed_use', 'government', 'other')),
  estimated_value NUMERIC,
  fee_proposal NUMERIC,
  submission_date DATE,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'submitted', 'won', 'lost', 'withdrawn')),
  probability NUMERIC CHECK (probability >= 0 AND probability <= 100),
  lead_consultant TEXT,
  client_onboarding_status TEXT DEFAULT 'pending' CHECK (client_onboarding_status IN ('pending', 'in_progress', 'completed')),
  stage_breakdown JSONB DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invoices table
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  invoice_number TEXT UNIQUE NOT NULL,
  project_name TEXT,
  client_name TEXT,
  amount NUMERIC,
  tax_amount NUMERIC,
  total_amount NUMERIC,
  issue_date DATE,
  due_date DATE,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
  description TEXT,
  riba_stage TEXT,
  billing_hours NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Expenses table
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  description TEXT NOT NULL,
  project_name TEXT,
  category TEXT,
  amount NUMERIC NOT NULL,
  date DATE NOT NULL,
  submitted_by TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'reimbursed', 'paid')),
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Deliverables table
CREATE TABLE IF NOT EXISTS public.deliverables (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  project_name TEXT NOT NULL,
  riba_stage TEXT CHECK (riba_stage IN ('stage_0', 'stage_1', 'stage_2', 'stage_3', 'stage_4', 'stage_5', 'stage_6', 'stage_7')),
  deliverable_type TEXT CHECK (deliverable_type IN ('cost_plan', 'boq', 'feasibility_report', 'procurement_strategy', 'tender_report', 'cost_report', 'final_account', 'specification', 'other')),
  due_date DATE,
  originator TEXT,
  checker TEXT,
  reviewer TEXT,
  authoriser TEXT,
  originator_status TEXT CHECK (originator_status IN ('pending', 'approved', 'rejected')),
  checker_status TEXT CHECK (checker_status IN ('pending', 'approved', 'rejected')),
  reviewer_status TEXT CHECK (reviewer_status IN ('pending', 'approved', 'rejected')),
  authoriser_status TEXT CHECK (authoriser_status IN ('pending', 'approved', 'rejected')),
  overall_status TEXT DEFAULT 'not_started' CHECK (overall_status IN ('not_started', 'in_progress', 'under_review', 'approved', 'rejected', 'issued')),
  version TEXT DEFAULT 'v1.0',
  comments TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Milestones table
CREATE TABLE IF NOT EXISTS public.milestones (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  project_name TEXT NOT NULL,
  phase TEXT CHECK (phase IN ('kick_off', 'feasibility', 'design', 'pre_construction', 'construction', 'post_completion', 'deliverable')),
  riba_stage TEXT CHECK (riba_stage IN ('stage_0', 'stage_1', 'stage_2', 'stage_3', 'stage_4', 'stage_5', 'stage_6', 'stage_7')),
  due_date DATE,
  assigned_to TEXT,
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'overdue')),
  completed_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Documents table
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  project_name TEXT,
  category TEXT CHECK (category IN ('contract', 'proposal', 'report', 'drawing', 'specification', 'correspondence', 'financial', 'hr', 'bid', 'other')),
  folder TEXT,
  version TEXT DEFAULT 'v1.0',
  description TEXT,
  tags JSONB DEFAULT '[]',
  file_url TEXT,
  uploaded_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id),
  action TEXT NOT NULL,
  resource TEXT NOT NULL,
  resource_id UUID,
  old_values JSONB,
  new_values JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default roles
INSERT INTO public.roles (name, description) VALUES
('admin', 'Full system access'),
('hr', 'Human resources management'),
('qs', 'Quantity surveying operations'),
('billing', 'Invoice and payment management'),
('project_manager', 'Project oversight'),
('finance', 'Financial reporting'),
('reviewer', 'Document review access'),
('approver', 'Approval permissions')
ON CONFLICT (name) DO NOTHING;

-- Insert default permissions
INSERT INTO public.permissions (resource, action, description) VALUES
('employees', 'create', 'Create employee records'),
('employees', 'read', 'View employee records'),
('employees', 'update', 'Update employee records'),
('employees', 'delete', 'Delete employee records'),
('projects', 'create', 'Create projects'),
('projects', 'read', 'View projects'),
('projects', 'update', 'Update projects'),
('projects', 'delete', 'Delete projects'),
('timesheets', 'create', 'Submit timesheets'),
('timesheets', 'read', 'View timesheets'),
('timesheets', 'update', 'Update timesheets'),
('timesheets', 'approve', 'Approve timesheets'),
('invoices', 'create', 'Create invoices'),
('invoices', 'read', 'View invoices'),
('invoices', 'update', 'Update invoices'),
('expenses', 'create', 'Submit expenses'),
('expenses', 'read', 'View expenses'),
('expenses', 'approve', 'Approve expenses'),
('bids', 'create', 'Create bids'),
('bids', 'read', 'View bids'),
('bids', 'update', 'Update bids'),
('deliverables', 'create', 'Create deliverables'),
('deliverables', 'read', 'View deliverables'),
('deliverables', 'update', 'Update deliverables'),
('documents', 'create', 'Upload documents'),
('documents', 'read', 'View documents'),
('documents', 'update', 'Update documents')
ON CONFLICT (resource, action) DO NOTHING;

-- Assign permissions to roles
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE
  (r.name = 'admin') OR
  (r.name = 'hr' AND p.resource = 'employees') OR
  (r.name = 'qs' AND p.resource IN ('projects', 'timesheets', 'bids', 'deliverables')) OR
  (r.name = 'billing' AND p.resource IN ('invoices', 'expenses')) OR
  (r.name = 'project_manager' AND p.resource IN ('projects', 'timesheets', 'deliverables')) OR
  (r.name = 'finance' AND p.resource IN ('invoices', 'expenses', 'projects')) OR
  (r.name = 'reviewer' AND p.action IN ('read', 'update')) OR
  (r.name = 'approver' AND p.action = 'approve')
ON CONFLICT DO NOTHING;

-- Enable RLS
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timesheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliverables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can insert their own profile" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can view own profile" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can manage all users" ON public.users FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles ur JOIN public.roles r ON ur.role_id = r.id WHERE ur.user_id = auth.uid() AND r.name = 'admin')
);

-- RLS Policies for employees table
CREATE POLICY "Users can view employees" ON public.employees FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert employees" ON public.employees FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update employees" ON public.employees FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Users can delete employees" ON public.employees FOR DELETE TO authenticated USING (true);

-- RLS Policies for leave requests table
CREATE POLICY "Authenticated users can view leave requests" ON public.leave_requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage leave requests" ON public.leave_requests FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- RLS Policies for projects table
CREATE POLICY "Authenticated users can view projects" ON public.projects FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage projects" ON public.projects FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- RLS Policies for timesheets table
CREATE POLICY "Authenticated users can view timesheets" ON public.timesheets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage timesheets" ON public.timesheets FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- RLS Policies for resource_allocations table
CREATE POLICY "Authenticated users can view allocations" ON public.resource_allocations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage allocations" ON public.resource_allocations FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- RLS Policies for bids table
CREATE POLICY "Authenticated users can view bids" ON public.bids FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage bids" ON public.bids FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- RLS Policies for invoices table
CREATE POLICY "Authenticated users can view invoices" ON public.invoices FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage invoices" ON public.invoices FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- RLS Policies for expenses table
CREATE POLICY "Authenticated users can view expenses" ON public.expenses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage expenses" ON public.expenses FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- RLS Policies for deliverables table
CREATE POLICY "Authenticated users can view deliverables" ON public.deliverables FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage deliverables" ON public.deliverables FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- RLS Policies for milestones table
CREATE POLICY "Authenticated users can view milestones" ON public.milestones FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage milestones" ON public.milestones FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- RLS Policies for documents table
CREATE POLICY "Authenticated users can view documents" ON public.documents FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage documents" ON public.documents FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- RLS Policies for audit_logs table
CREATE POLICY "Authenticated users can view audit logs" ON public.audit_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "System can insert audit logs" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (true);

-- RLS Policies for roles and permissions (admin only)
CREATE POLICY "Authenticated users can view roles" ON public.roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can view own role assignments" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can manage roles" ON public.roles FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.user_roles ur JOIN public.roles r ON ur.role_id = r.id WHERE ur.user_id = auth.uid() AND r.name = 'admin')
);
CREATE POLICY "Admins can manage permissions" ON public.permissions FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.user_roles ur JOIN public.roles r ON ur.role_id = r.id WHERE ur.user_id = auth.uid() AND r.name = 'admin')
);
CREATE POLICY "Admins can manage role permissions" ON public.role_permissions FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.user_roles ur JOIN public.roles r ON ur.role_id = r.id WHERE ur.user_id = auth.uid() AND r.name = 'admin')
);
CREATE POLICY "Admins can manage user roles" ON public.user_roles FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.user_roles ur JOIN public.roles r ON ur.role_id = r.id WHERE ur.user_id = auth.uid() AND r.name = 'admin')
);

-- Repeat similar policies for other tables based on roles

-- Storage bucket for document uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload document objects" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'documents');

CREATE POLICY "Authenticated users can read document objects" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'documents');

CREATE POLICY "Authenticated users can update document objects" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'documents')
WITH CHECK (bucket_id = 'documents');

CREATE POLICY "Authenticated users can delete document objects" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'documents');

-- Keep updated_at current across mutable tables
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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_employees_email ON public.employees(email);
CREATE INDEX IF NOT EXISTS idx_employees_status ON public.employees(status);
CREATE INDEX IF NOT EXISTS idx_leave_requests_employee_id ON public.leave_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON public.leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_riba_stage ON public.projects(riba_stage);
CREATE INDEX IF NOT EXISTS idx_timesheets_date ON public.timesheets(date);
CREATE INDEX IF NOT EXISTS idx_timesheets_status ON public.timesheets(status);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_expenses_status ON public.expenses(status);
CREATE INDEX IF NOT EXISTS idx_deliverables_overall_status ON public.deliverables(overall_status);
CREATE INDEX IF NOT EXISTS idx_milestones_status ON public.milestones(status);
CREATE INDEX IF NOT EXISTS idx_documents_category ON public.documents(category);
