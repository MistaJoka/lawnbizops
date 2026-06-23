-- 0029: financial reports — cash-basis P&L over a range, plus breakdowns.
--
-- Same shape as dashboard_metrics (0018): SECURITY INVOKER (default) so RLS
-- scopes every aggregate to the caller's org; date bounds come from the client
-- (device-local). Cash-basis: income = payments collected (paid_at), expense =
-- expenses paid (spent_on). A/R aging is NOT here — it's computed client-side
-- from invoice_balances (isOpen/agingBucket already exist).

create or replace function public.pnl_summary(p_start date, p_end date)
returns table (
  income_cents bigint,
  expense_cents bigint,
  net_cents bigint
)
language sql
stable
set search_path = ''
as $$
  with i as (
    select coalesce(sum(amount_cents), 0)::bigint as income_cents
    from public.payments
    where paid_at between p_start and p_end
  ),
  e as (
    select coalesce(sum(amount_cents), 0)::bigint as expense_cents
    from public.expenses
    where spent_on between p_start and p_end
  )
  select i.income_cents, e.expense_cents, (i.income_cents - e.expense_cents)::bigint
  from i, e;
$$;

create or replace function public.expenses_by_category(p_start date, p_end date)
returns table (
  category text,
  total_cents bigint
)
language sql
stable
set search_path = ''
as $$
  select category, sum(amount_cents)::bigint as total_cents
  from public.expenses
  where spent_on between p_start and p_end
  group by category
  order by total_cents desc;
$$;

create or replace function public.income_by_method(p_start date, p_end date)
returns table (
  method text,
  total_cents bigint
)
language sql
stable
set search_path = ''
as $$
  select method, sum(amount_cents)::bigint as total_cents
  from public.payments
  where paid_at between p_start and p_end
  group by method
  order by total_cents desc;
$$;

grant execute on function public.pnl_summary(date, date) to authenticated;
grant execute on function public.expenses_by_category(date, date) to authenticated;
grant execute on function public.income_by_method(date, date) to authenticated;
