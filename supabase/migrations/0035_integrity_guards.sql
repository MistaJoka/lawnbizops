-- 0035: integrity guards — one invoice per estimate, resync respects hand-edited jobs
--
-- 1. A duplicate estimate→invoice conversion (two offline devices, or a retry
--    racing the cache) must fail at the database, not silently double-bill.
--    The client already disables Convert when linkedInvoiceId is set; this is
--    the backstop for the window that check can't see.
create unique index if not exists invoices_estimate_id_key
  on public.invoices (estimate_id)
  where estimate_id is not null;

-- 2. Jobs the operator has touched by hand (moved to another day, checklist
--    written) must survive a schedule resync. NULL = untouched, fair game to
--    delete and regenerate. materialize_jobs' on-conflict guard keeps the
--    surviving row from being duplicated (it retains its occurrence_date).
alter table public.jobs
  add column if not exists customized_at timestamptz;

create or replace function public.resync_schedule(p_schedule_id uuid, through_date date)
returns integer
language plpgsql
set search_path = ''
as $$
begin
  delete from public.jobs
    where schedule_id = p_schedule_id
      and status = 'scheduled'
      and scheduled_date >= current_date
      and customized_at is null;
  update public.recurring_schedules
    set last_materialized_through = null
    where id = p_schedule_id;
  return public.materialize_jobs(through_date);
end;
$$;
