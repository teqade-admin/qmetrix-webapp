-- Multiple employee contracts patch for QMetrix.
-- Each contract: { "name", "path", "status": "active"|"inactive", "uploaded_at" }.
-- The newest upload is "active"; previous ones become "inactive".
-- Run in the Supabase SQL editor after supabase_employee_docs.sql. Idempotent.

ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS contracts JSONB DEFAULT '[]'::jsonb;
