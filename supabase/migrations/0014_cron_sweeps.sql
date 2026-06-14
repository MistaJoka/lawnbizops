-- 0014: server-side scheduling — nightly job materialization for every org.
--
-- Until now recurring jobs were materialized only when someone opened the app
-- (client calls materialize_jobs() on launch). That's fine for the active user
-- but a multi-tenant SaaS can't depend on it. This adds a nightly pg_cron sweep
-- that materializes the rolling horizon for ALL active orgs. The client-side
-- call stays as an immediate "I just made a schedule" catch-up.

create extension if not exists pg_cron;

-- Global sweep. SECURITY DEFINER (owned by postgres) so it runs RLS-free and
-- sees every org's schedules; it reuses the tested per-org materializer, whose
-- inserts already stamp each job with its schedule's org_id. Horizon = 8 weeks.
create or replace function public.materialize_jobs_all()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
begin
  return public.materialize_jobs((current_date + 56)::date);
end;
$$;

-- Nightly at 07:00 UTC (~02:00–03:00 US Eastern). Idempotent re-registration.
do $$
begin
  if exists (select 1 from cron.job where jobname = 'materialize-jobs-nightly') then
    perform cron.unschedule('materialize-jobs-nightly');
  end if;
  perform cron.schedule(
    'materialize-jobs-nightly',
    '0 7 * * *',
    'select public.materialize_jobs_all();'
  );
end;
$$;
