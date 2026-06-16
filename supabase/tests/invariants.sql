-- =============================================================================
-- invariants.sql — data-layer conservation laws that must hold on ANY data.
--
-- These are not example checks: each asserts a property the system can never
-- violate if it's correct (money reconciles, no card lives in limbo, tenancy
-- is total). Run against a seeded local stack:
--   docker exec -i supabase_db_LawnBizOps psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 -f supabase/tests/invariants.sql
-- A FAIL raises and aborts (ON_ERROR_STOP) — wire into CI like rls_isolation.sql.
-- =============================================================================

create or replace function pg_temp.assert(cond boolean, label text)
  returns void language plpgsql as $$
begin
  if cond then raise notice 'PASS: %', label;
  else raise exception 'FAIL: %', label; end if;
end $$;

-- --- Tenancy: every tenant row carries an org (RLS depends on it) -------------
select pg_temp.assert(
  (select count(*) = 0 from public.clients   where org_id is null), 'clients.org_id total');
select pg_temp.assert(
  (select count(*) = 0 from public.jobs      where org_id is null), 'jobs.org_id total');
select pg_temp.assert(
  (select count(*) = 0 from public.invoices  where org_id is null), 'invoices.org_id total');
select pg_temp.assert(
  (select count(*) = 0 from public.estimates where org_id is null), 'estimates.org_id total');
select pg_temp.assert(
  (select count(*) = 0 from public.payments  where org_id is null), 'payments.org_id total');

-- --- Money: the balances view must reconcile ---------------------------------
select pg_temp.assert(
  (select count(*) = 0 from public.invoice_balances
     where balance_cents <> total_cents - paid_cents),
  'balance = total - paid for every invoice');

select pg_temp.assert(
  (select count(*) = 0 from public.invoice_balances where paid_cents > total_cents),
  'no invoice is overpaid (paid <= total)');

select pg_temp.assert(
  (select count(*) = 0 from (
     select i.invoice_id, coalesce(sum(p.amount_cents), 0) as summed, i.paid_cents
       from public.invoice_balances i
       left join public.payments p on p.invoice_id = i.invoice_id
       group by i.invoice_id, i.paid_cents
   ) r where r.summed <> r.paid_cents),
  'paid_cents equals the sum of recorded payments');

-- --- Lane integrity: every job status is in the known domain -----------------
select pg_temp.assert(
  (select count(*) = 0 from public.jobs
     where status not in
       ('scheduled','in_progress','done','skipped','canceled','invoiced')),
  'job status stays within the known set');

-- --- The one-way-door guard: no stranded "invoiced" job ----------------------
-- A job marked invoiced must be backed by a live (non-void) invoice line. If
-- voiding an invoice ever leaves its job at 'invoiced', this catches the limbo.
select pg_temp.assert(
  (select count(*) = 0 from public.jobs j
     where j.status = 'invoiced'
       and not exists (
         select 1 from public.invoice_items ii
           join public.invoices inv on inv.id = ii.invoice_id
          where ii.job_id = j.id and inv.status <> 'void')),
  'every invoiced job is backed by a non-void invoice line');

-- --- Numbering: assigned numbers are unique per org --------------------------
select pg_temp.assert(
  (select count(*) = 0 from (
     select org_id, number from public.invoices
       where number is not null group by org_id, number having count(*) > 1) d),
  'invoice numbers are unique within an org');

select pg_temp.assert(
  (select count(*) = 0 from (
     select org_id, number from public.estimates
       where number is not null group by org_id, number having count(*) > 1) d),
  'estimate numbers are unique within an org');

\echo 'ALL INVARIANTS PASSED'
