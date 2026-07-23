-- 0045: deposits on accepted estimates — collect money before the work.
--
-- Recurring installs and big one-offs (the demo seed literally models a 50%
-- paver deposit) had no code path: convert-to-invoice always billed the full
-- estimate. This adds the minimal deposit model:
--   * invoices.is_deposit — a deposit invoice is a normal invoice (same
--     lifecycle, email, payment, A/R aging) carrying one "Deposit — EST-x"
--     line, flagged so the estimate screen can tell it apart from the final.
--   * invoice_balances gains estimate_id + is_deposit (appended — replaced in
--     place) so an estimate can list its linked invoices WITH their subtotals
--     in one query; the final conversion uses those subtotals to append a
--     negative "Less deposit received" line.
-- Tax: the deposit line is taxed at the org snapshot like any line; the final
-- invoice taxes the net (items − deposit). round(d·r) + round((T−d)·r) can
-- differ from round(T·r) by at most one cent — accepted for v1.

alter table public.invoices
  add column is_deposit boolean not null default false;

create or replace view public.invoice_balances
with (security_invoker = true) as
select
  i.id as invoice_id,
  i.user_id,
  i.client_id,
  i.number,
  i.status,
  i.issued_at,
  i.due_at,
  i.last_reminded_at,
  (coalesce(items.subtotal_cents, 0)
    + round(coalesce(items.subtotal_cents, 0) * i.tax_bps / 10000.0))::integer
    as total_cents,
  coalesce(pays.paid_cents, 0) as paid_cents,
  ((coalesce(items.subtotal_cents, 0)
    + round(coalesce(items.subtotal_cents, 0) * i.tax_bps / 10000.0))
    - coalesce(pays.paid_cents, 0))::integer as balance_cents,
  coalesce(items.subtotal_cents, 0) as subtotal_cents,
  i.tax_bps,
  round(coalesce(items.subtotal_cents, 0) * i.tax_bps / 10000.0)::integer
    as tax_cents,
  i.estimate_id,
  i.is_deposit
from public.invoices i
left join (
  select invoice_id, sum(round(quantity * unit_price_cents))::integer as subtotal_cents
  from public.invoice_items group by invoice_id
) items on items.invoice_id = i.id
left join (
  select invoice_id, sum(amount_cents)::integer as paid_cents
  from public.payments group by invoice_id
) pays on pays.invoice_id = i.id;
