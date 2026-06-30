-- Currency patch for QMetrix Bid Management.
-- Adds a configurable base (reporting) currency and a per-bid currency.
-- Run in the Supabase SQL editor after supabase_branding.sql + supabase_clients.sql. Idempotent.

-- Base/reporting currency the app converts everything TO (configured in admin Settings).
ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS base_currency TEXT DEFAULT 'GBP';

UPDATE public.app_settings SET base_currency = 'GBP' WHERE base_currency IS NULL;

-- Currency a bid's fee / value is expressed in (defaults to the base currency in the UI).
ALTER TABLE public.bids
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'GBP';
