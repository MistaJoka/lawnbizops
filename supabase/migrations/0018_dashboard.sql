-- 0018: dashboard metrics — one RLS-scoped round-trip for the business pulse.
--
-- SECURITY INVOKER (default): every aggregate runs under the caller's RLS, so
-- it only ever sees their org's rows. Date boundaries come from the client so
-- "this month / this week" matches the device's local time (the app stores
-- date-only values in local time, never UTC).

create or replace function public.dashboard_metrics(
  p_today date,
  p_month_start date,
  p_week_start date,
  p_week_end date
)
returns table (
  collected_cents bigint,
  outstanding_cents bigint,
  pipeline_cents bigint,
  jobs_week integer,
  jobs_done_week integer,
  open_tasks integer,
  overdue_tasks integer,
  leads integer,
  quoted integer,
  active integer,
  dormant integer
)
language sql
stable
set search_path = ''
as $$
  select
    coalesce((
      select sum(amount_cents) from public.payments
      where paid_at >= p_month_start and paid_at <= p_today
    ), 0)::bigint,
    coalesce((
      select sum(balance_cents) from public.invoice_balances
      where status in ('sent', 'partially_paid', 'draft') and balance_cents > 0
    ), 0)::bigint,
    coalesce((
      select sum(round(ei.quantity * ei.unit_price_cents))
      from public.estimate_items ei
      join public.estimates e on e.id = ei.estimate_id
      where e.status in ('draft', 'sent')
    ), 0)::bigint,
    (select count(*) from public.jobs
      where scheduled_date between p_week_start and p_week_end and status <> 'canceled')::integer,
    (select count(*) from public.jobs
      where scheduled_date between p_week_start and p_week_end and status in ('done', 'invoiced'))::integer,
    (select count(*) from public.tasks where not done)::integer,
    (select count(*) from public.tasks
      where not done and due_date is not null and due_date < p_today)::integer,
    (select count(*) from public.clients where stage = 'lead' and archived_at is null)::integer,
    (select count(*) from public.clients where stage = 'quoted' and archived_at is null)::integer,
    (select count(*) from public.clients where stage = 'active' and archived_at is null)::integer,
    (select count(*) from public.clients where stage = 'dormant' and archived_at is null)::integer;
$$;

grant execute on function public.dashboard_metrics(date, date, date, date) to authenticated;
