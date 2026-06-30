-- System roles redefinition for QMetrix.
-- Replaces the old app_role values with the 7-role RBAC model.
-- Run in the Supabase SQL editor. Idempotent.

-- 1. Drop the old CHECK so we can remap values.
ALTER TABLE public.employees DROP CONSTRAINT IF EXISTS employees_app_role_check;

-- 2. Remap legacy roles → new roles.
UPDATE public.employees SET app_role = CASE app_role
  WHEN 'admin'           THEN 'super_admin'
  WHEN 'hr'              THEN 'hr_admin'
  WHEN 'finance'         THEN 'finance_admin'
  WHEN 'billing'         THEN 'finance_user'
  WHEN 'project_manager' THEN 'ops_admin'
  WHEN 'qs'              THEN 'ops_user'
  WHEN 'reviewer'        THEN 'ops_user'
  WHEN 'approver'        THEN 'ops_user'
  ELSE app_role
END
WHERE app_role IN ('admin','hr','finance','billing','project_manager','qs','reviewer','approver');

-- 3. New default + CHECK.
ALTER TABLE public.employees ALTER COLUMN app_role SET DEFAULT 'ops_user';
ALTER TABLE public.employees ADD CONSTRAINT employees_app_role_check
  CHECK (app_role IN ('super_admin','hr_admin','hr_user','ops_admin','ops_user','finance_admin','finance_user'));
