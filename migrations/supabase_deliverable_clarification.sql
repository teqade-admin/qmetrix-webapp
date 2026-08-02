-- Deliverables: allow an OCRA step to be sent back for clarification.
--
-- The four step-status columns were constrained to ('pending','approved','rejected'),
-- so a reviewer could only approve or reject outright. Adding 'clarification' lets a
-- checker/reviewer/authoriser return the deliverable to the author with a question
-- instead of failing it. Idempotent — safe to re-run.

DO $$
DECLARE
  col TEXT;
BEGIN
  FOREACH col IN ARRAY ARRAY['originator_status', 'checker_status', 'reviewer_status', 'authoriser_status']
  LOOP
    EXECUTE format(
      'ALTER TABLE public.deliverables DROP CONSTRAINT IF EXISTS deliverables_%s_check',
      col
    );
    EXECUTE format(
      'ALTER TABLE public.deliverables ADD CONSTRAINT deliverables_%s_check
         CHECK (%I IN (''pending'', ''approved'', ''rejected'', ''clarification''))',
      col, col
    );
  END LOOP;
END $$;
