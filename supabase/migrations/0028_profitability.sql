-- 0028: profitability — revenue vs cost per job and per client, over a range.
--
-- Same shape as dashboard_metrics (0018): SECURITY INVOKER (default) so every
-- aggregate runs under the caller's RLS and only sees their org. Date bounds
-- come from the client (device-local), never server now()/current_date.
--
-- Revenue recognition is deliberately split (documented in the accounting plan):
--   • JOB revenue   = BILLED   — invoice_items on non-void invoices, by issued_at.
--     Payments aren't job-tagged, so collected-basis can't attribute to a job.
--   • CLIENT revenue = COLLECTED — payments by paid_at (true cash-basis).
-- The UI labels these "billed" vs "collected" so the two views don't look
-- contradictory.

create or replace function public.job_profitability(p_start date, p_end date)
returns table (
  job_id uuid,
  title text,
  client_id uuid,
  revenue_cents bigint,
  cost_cents bigint,
  profit_cents bigint
)
language sql
stable
set search_path = ''
as $$
  with rev as (
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
  ids as (
    select job_id from rev
    union
    select job_id from cost
  )
  select
    j.id as job_id,
    j.title,
    p.client_id,
    coalesce(rev.revenue_cents, 0)::bigint as revenue_cents,
    coalesce(cost.cost_cents, 0)::bigint as cost_cents,
    (coalesce(rev.revenue_cents, 0) - coalesce(cost.cost_cents, 0))::bigint as profit_cents
  from ids
  join public.jobs j on j.id = ids.job_id
  left join public.properties p on p.id = j.property_id
  left join rev on rev.job_id = ids.job_id
  left join cost on cost.job_id = ids.job_id
  order by profit_cents desc;
$$;

create or replace function public.client_profitability(p_start date, p_end date)
returns table (
  client_id uuid,
  name text,
  revenue_cents bigint,
  cost_cents bigint,
  profit_cents bigint
)
language sql
stable
set search_path = ''
as $$
  with rev as (
    select i.client_id, sum(pay.amount_cents)::bigint as revenue_cents
    from public.payments pay
    join public.invoices i on i.id = pay.invoice_id
    where pay.paid_at between p_start and p_end
    group by i.client_id
  ),
  cost as (
    select e.client_id, sum(e.amount_cents)::bigint as cost_cents
    from public.expenses e
    where e.client_id is not null
      and e.spent_on between p_start and p_end
    group by e.client_id
  ),
  ids as (
    select client_id from rev
    union
    select client_id from cost
  )
  select
    c.id as client_id,
    c.name,
    coalesce(rev.revenue_cents, 0)::bigint as revenue_cents,
    coalesce(cost.cost_cents, 0)::bigint as cost_cents,
    (coalesce(rev.revenue_cents, 0) - coalesce(cost.cost_cents, 0))::bigint as profit_cents
  from ids
  join public.clients c on c.id = ids.client_id
  left join rev on rev.client_id = ids.client_id
  left join cost on cost.client_id = ids.client_id
  order by profit_cents desc;
$$;

grant execute on function public.job_profitability(date, date) to authenticated;
grant execute on function public.client_profitability(date, date) to authenticated;
