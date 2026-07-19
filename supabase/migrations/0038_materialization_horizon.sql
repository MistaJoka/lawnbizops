-- 0038: extend the job materialization horizon from 8 weeks to ~6 months.
--
-- With a 56-day horizon a monthly client only ever had two visits on the
-- books, and anything past ~2 months (schedule view, capacity planning,
-- revenue projection) showed empty. materialize_jobs() is incremental — each
-- schedule resumes from last_materialized_through — so widening the horizon
-- is a one-time top-up per schedule, not a recurring cost, and the
-- on-conflict (schedule_id, occurrence_date) guard keeps it idempotent.
--
-- The client side (src/lib/dates.ts materializeHorizon) now requests
-- current_date + 182 on app load and after schedule edits; this keeps the
-- nightly pg_cron sweep (registered in 0014, unchanged) generating to the
-- same horizon for orgs that don't open the app.

create or replace function public.materialize_jobs_all()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
begin
  return public.materialize_jobs((current_date + 182)::date);
end;
$$;
