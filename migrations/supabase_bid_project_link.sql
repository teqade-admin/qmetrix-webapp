-- Connect a won bid to the project it opened, in both directions.
--
-- "Kick Off Project" copied the bid's title, client, sector and fees into a new
-- project and marked the bid won — but neither record pointed at the other, so
-- nothing could answer "which bid did this project come from?" or "what did we
-- bid versus what did it actually cost?".
--
-- Both columns are nullable: projects can be created without a bid, and a bid
-- may never be won. ON DELETE SET NULL so removing one never destroys the other.
--
-- Idempotent — safe to re-run.

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS bid_id UUID REFERENCES public.bids(id) ON DELETE SET NULL;

ALTER TABLE public.bids
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS projects_bid_id_idx ON public.projects (bid_id);
CREATE INDEX IF NOT EXISTS bids_project_id_idx ON public.bids (project_id);

-- Backfill anything already paired. Won bids were only ever tied to a project
-- by sharing a title, so match on that — and only when it is unambiguous, so a
-- duplicate name never links the wrong pair.
DO $$
DECLARE
  linked INT := 0;
BEGIN
  WITH pairs AS (
    SELECT b.id AS bid_id, p.id AS project_id
      FROM public.bids b
      JOIN public.projects p
        ON btrim(lower(p.name)) = btrim(lower(b.title))
     WHERE b.status = 'won'
       AND b.project_id IS NULL
       AND p.bid_id IS NULL
       AND (SELECT count(*) FROM public.projects x
             WHERE btrim(lower(x.name)) = btrim(lower(b.title))) = 1
       AND (SELECT count(*) FROM public.bids y
             WHERE btrim(lower(y.title)) = btrim(lower(b.title)) AND y.status = 'won') = 1
  ), updated_bids AS (
    UPDATE public.bids b SET project_id = pairs.project_id
      FROM pairs WHERE b.id = pairs.bid_id
    RETURNING 1
  ), updated_projects AS (
    UPDATE public.projects p SET bid_id = pairs.bid_id
      FROM pairs WHERE p.id = pairs.project_id
    RETURNING 1
  )
  SELECT count(*) INTO linked FROM updated_bids;

  RAISE NOTICE 'Linked % won bid(s) to their project', linked;
END $$;
