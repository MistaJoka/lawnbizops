-- 0042: sales tax on invoices — a compliant invoice needs a tax line.
--
-- Until now no jurisdictional sales tax existed anywhere: no configurable
-- rate, no tax column, no tax line on any document. Many states tax lawn
-- services/materials; the owner literally could not produce a compliant
-- invoice.
--
-- Model (deliberately v1-simple):
--   * One flat org-level rate in basis points (700 = 7.00%) on
--     business_settings — no per-line taxability, no multi-jurisdiction.
--   * Each invoice SNAPSHOTS the rate at creation (invoices.tax_bps) so a
--     later settings change never rewrites history. Existing invoices keep
--     tax_bps = 0 — no retroactive tax.
--   * Totals stay computed, never stored: invoice_balances now returns
--     total = subtotal + round(subtotal * tax_bps / 10000), plus new
--     subtotal_cents / tax_bps / tax_cents columns (appended — the view is
--     replaced in place). apply_payment reads totals from this view, so
--     payment status math picks the tax up automatically (0031).
--
-- Client-side mirror: taxCents()/invoiceTotalWithTaxCents() in
-- src/features/invoices/hooks.ts must round the same way (round half up on
-- positive values matches numeric round()).

alter table public.business_settings
  add column sales_tax_bps integer not null default 0
    check (sales_tax_bps between 0 and 5000);

alter table public.invoices
  add column tax_bps integer not null default 0
    check (tax_bps between 0 and 5000);

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
    as tax_cents
from public.invoices i
left join (
  select invoice_id, sum(round(quantity * unit_price_cents))::integer as subtotal_cents
  from public.invoice_items group by invoice_id
) items on items.invoice_id = i.id
left join (
  select invoice_id, sum(amount_cents)::integer as paid_cents
  from public.payments group by invoice_id
) pays on pays.invoice_id = i.id;
