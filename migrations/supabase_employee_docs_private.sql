-- Private storage bucket for sensitive employee documents (contracts, HR docs).
-- Unlike 'documents'/'branding', this bucket is NOT public — files are only
-- reachable via short-lived signed URLs minted for authenticated users.
-- Run in the Supabase SQL editor. Idempotent.

INSERT INTO storage.buckets (id, name, public)
VALUES ('employee-docs', 'employee-docs', false)
ON CONFLICT (id) DO NOTHING;

-- Authenticated users can upload.
DROP POLICY IF EXISTS "Authenticated can upload employee docs" ON storage.objects;
CREATE POLICY "Authenticated can upload employee docs" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'employee-docs');

-- Authenticated users can read (required to mint signed URLs). No public access.
DROP POLICY IF EXISTS "Authenticated can read employee docs" ON storage.objects;
CREATE POLICY "Authenticated can read employee docs" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'employee-docs');

DROP POLICY IF EXISTS "Authenticated can update employee docs" ON storage.objects;
CREATE POLICY "Authenticated can update employee docs" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'employee-docs')
WITH CHECK (bucket_id = 'employee-docs');

DROP POLICY IF EXISTS "Authenticated can delete employee docs" ON storage.objects;
CREATE POLICY "Authenticated can delete employee docs" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'employee-docs');
