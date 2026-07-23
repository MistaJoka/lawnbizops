-- 0047: time-on-site + labor costing (audit C4 — margins were structurally
-- overstated because labor was invisible and in_progress wrote no timestamp).
--
-- 1. jobs.started_at — stamped by the app when a job flips to in_progress
--    (first start only; a reopened job keeps its original clock-in).
-- 2. business_settings.labor_rate_cents_per_hour — org hourly labor rate.
--    Default 0 = labor costing OFF; nothing changes until the operator sets
--    a rate in Settings, so existing profit numbers don't silently move.
-- 3. job_profitability grows a labor leg: minutes between the two stamps at
--    the org rate, attributed by the job's scheduled_date (date-only,
--    device-local — the repo's dating rule; avoids timezone drift that a
--    completed_at::date conversion would smuggle in for evening jobs).
--    Client-side mirror: src/features/jobs/timeOnSite.ts — keep in sync.
--    Return shape changes (adds labor_cents/labor_minutes) → drop + recreate.

alter table public.jobs
  add column if not exists started_at timestamptz;

alter table public.business_settings
  add column if not exists labor_rate_cents_per_hour integer not null default 0
    check (labor_rate_cents_per_hour >= 0);

drop function if exists public.job_profitability(date, date);

create function public.job_profitability(p_start date, p_end date)
returns table (
  job_id uuid,
  title text,
  client_id uuid,
  revenue_cents bigint,
  cost_cents bigint,
  labor_cents bigint,
  labor_minutes integer,
  profit_cents bigint
)
language sql
stable
set search_path = ''
as $$
  with rate as (
    -- SECURITY INVOKER + RLS: the caller sees exactly one settings row (their org).
    select coalesce(max(labor_rate_cents_per_hour), 0) as cents_per_hour
    from public.business_settings
  ),
  rev as (
    select ii.job_id, sum(round(ii.quantity * ii.unit_price_cents))::bigint as revenue_cents
    from public.invoice_items ii
    join public.invoices i on i.id = ii.invoice_id
    where ii.job_id is not null
      and i.status <> 'void'
      and i.issued_at between p_start and p_end
    group by ii.job_id
  ),
  cost as (
    select e.job_id, sum(e.amount_cents)::bigint as cost_cents
    from public.expenses e
    where e.job_id is not null
      and e.spent_on between p_start and p_end
    group by e.job_id
  ),
  labor as (
    select
      j.id as job_id,
      round(extract(epoch from (j.completed_at - j.started_at)) / 60)::integer as minutes
    from public.jobs j
    where j.started_at is not null
      and j.completed_at is not null
      and j.completed_at > j.started_at
      and j.scheduled_date between p_start and p_end
  ),
  ids as (
    select job_id from rev
    union
    select job_id from cost
    union
    select job_id from labor where (select cents_per_hour from rate) > 0
  )
  select
    j.id as job_id,
    j.title,
    p.client_id,
    coalesce(rev.revenue_cents, 0)::bigint as revenue_cents,
    (coalesce(cost.cost_cents, 0)
      + round(coalesce(labor.minutes, 0) * (select cents_per_hour from rate) / 60.0))::bigint
      as cost_cents,
    round(coalesce(labor.minutes, 0) * (select cents_per_hour from rate) / 60.0)::bigint
      as labor_cents,
    coalesce(labor.minutes, 0) as labor_minutes,
    (coalesce(rev.revenue_cents, 0)
      - coalesce(cost.cost_cents, 0)
      - round(coalesce(labor.minutes, 0) * (select cents_per_hour from rate) / 60.0))::bigint
      as profit_cents
  from ids
  join public.jobs j on j.id = ids.job_id
  left join public.properties p on p.id = j.property_id
  left join rev on rev.job_id = ids.job_id
  left join cost on cost.job_id = ids.job_id
  left join labor on labor.job_id = ids.job_id
  order by profit_cents desc;
$$;

grant execute on function public.job_profitability(date, date) to authenticated;
