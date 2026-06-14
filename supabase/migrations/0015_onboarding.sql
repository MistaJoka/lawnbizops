-- 0015: first-run onboarding flag on business_settings.
-- Null → the org hasn't completed the setup wizard yet; the app routes a fresh
-- signup through /onboarding until this is stamped.

alter table public.business_settings
  add column onboarded_at timestamptz;
