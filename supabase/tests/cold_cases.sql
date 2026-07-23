-- =============================================================================
-- cold_cases.sql — behavioral regression pins for past PRODUCTION bugs.
--
-- Each block re-runs the exact scenario that once broke prod and asserts the
-- fix still holds. A case that fails here is a REOPENED bug — treat it as a
-- louder failure than a new one. Companion registry: .qa/registry.json
-- (every case here has an entry there; docs/qa-playbook.md has the policy).
--
-- Run against a seeded local stack (all migrations applied):
--   psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
--     -v ON_ERROR_STOP=1 -f supabase/tests/cold_cases.sql
-- Wrapped in begin/rollback — leaves no trace.
-- =============================================================================

begin;

-- Provision a fresh tenant via the signup trigger (handle_new_user), same
-- pattern as rls_isolation.sql, distinct uuid so the two tests never collide.
insert into auth.users (instance_id, id, aud, role, email, raw_user_meta_data)
values
  ('00000000-0000-0000-0000-000000000000', '33333333-3333-3333-3333-333333333333',
   'authenticated', 'authenticated', 'coldcase@test.dev', '{"business_name":"Cold Case Lawn Co"}');

create or replace function pg_temp.become(uid text) returns void
language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
end $$;

create or replace function pg_temp.assert(cond boolean, label text) returns void
language plpgsql as $$
begin
  if cond then raise notice 'PASS: %', label;
  else raise exception 'COLD CASE REOPENED ❌ %', label; end if;
end $$;

-- Helper: assert a statement is rejected by a UNIQUE constraint — and ONLY by
-- that. Success or any other error means the guard is gone or the test broke.
create or replace function pg_temp.expect_unique_violation(stmt text, label text)
returns void language plpgsql as $$
begin
  execute stmt;
  raise exception 'COLD CASE REOPENED ❌ % (statement was allowed)', label;
exception
  when unique_violation then raise notice 'PASS: %', label;
end $$;

create or replace function pg_temp.expect_check_violation(stmt text, label text)
returns void language plpgsql as $$
begin
  execute stmt;
  raise exception 'COLD CASE REOPENED ❌ % (statement was allowed)', label;
exception
  when check_violation then raise notice 'PASS: %', label;
end $$;

select pg_temp.become('33333333-3333-3333-3333-333333333333');

insert into public.clients (id, name)
  values ('cccccccc-0000-0000-0000-000000000001', 'Cold Case Client');

-- ── CC-002 (migration 0019) — numbering triggers keyed by a dropped column ───
-- After 0012 re-keyed business_settings from user_id to org_id, the INV-n/EST-n
-- triggers still wrote `on conflict (user_id)` — every invoice INSERT failed in
-- prod. Pin: creating an invoice/estimate as a signed-up org user assigns a
-- sequential number (proves the trigger resolves business_settings by org).
insert into public.invoices (id, client_id)
  values ('cccccccc-0000-0000-0000-000000000011', 'cccccccc-0000-0000-0000-000000000001');
select pg_temp.assert(
  (select number from public.invoices
     where id = 'cccccccc-0000-0000-0000-000000000011') is not null,
  'CC-002: invoice insert assigns a number (org-keyed trigger)');

insert into public.invoices (id, client_id)
  values ('cccccccc-0000-0000-0000-000000000012', 'cccccccc-0000-0000-0000-000000000001');
select pg_temp.assert(
  (select count(distinct number) from public.invoices
     where id in ('cccccccc-0000-0000-0000-000000000011',
                  'cccccccc-0000-0000-0000-000000000012')) = 2,
  'CC-002: consecutive invoices get distinct sequential numbers');

insert into public.estimates (id, client_id)
  values ('cccccccc-0000-0000-0000-000000000021', 'cccccccc-0000-0000-0000-000000000001');
select pg_temp.assert(
  (select number from public.estimates
     where id = 'cccccccc-0000-0000-0000-000000000021') is not null,
  'CC-002: estimate insert assigns a number (org-keyed trigger)');

-- ── CC-003 (migration 0031) — fully reversed invoice stuck at ''paid'' ───────
-- apply_payment's status recompute ended in `else status`, so reversing every
-- payment left the invoice at 'paid' forever. Pin the full round trip:
-- pay → 'paid', append the offsetting negative line → back to 'sent'.
insert into public.invoice_items (id, invoice_id, description, quantity, unit_price_cents)
  values ('cccccccc-0000-0000-0000-000000000031',
          'cccccccc-0000-0000-0000-000000000011', 'Mow + edge', 1, 10000);

select public.apply_payment(
  'cccccccc-0000-0000-0000-000000000032'::uuid,
  'cccccccc-0000-0000-0000-000000000011'::uuid,
  10000, 'cash');
select pg_temp.assert(
  (select status from public.invoices
     where id = 'cccccccc-0000-0000-0000-000000000011') = 'paid',
  'CC-003: full payment marks the invoice paid');

select public.apply_payment(
  'cccccccc-0000-0000-0000-000000000033'::uuid,
  'cccccccc-0000-0000-0000-000000000011'::uuid,
  -10000, 'cash', current_date,
  'Reversal of cccccccc-0000-0000-0000-000000000032');
select pg_temp.assert(
  (select status from public.invoices
     where id = 'cccccccc-0000-0000-0000-000000000011') = 'sent',
  'CC-003: fully reversed invoice reverts to sent, not stuck at paid');
select pg_temp.assert(
  (select paid_cents from public.invoice_balances
     where invoice_id = 'cccccccc-0000-0000-0000-000000000011') = 0,
  'CC-003: reversal restores the balance (paid back to zero)');

-- The relaxed constraint must still reject a meaningless zero-amount line.
select pg_temp.expect_check_violation(
  $q$ insert into public.payments (id, invoice_id, amount_cents, method)
      values ('cccccccc-0000-0000-0000-000000000034',
              'cccccccc-0000-0000-0000-000000000011', 0, 'cash') $q$,
  'CC-003: zero-amount payment line is still rejected');

-- ── CC-004 (migration 0035) — duplicate estimate→invoice double-billing ──────
-- Two offline devices (or a retry racing the cache) could both convert the same
-- estimate, silently double-billing the client. The partial unique index on
-- invoices.estimate_id is the backstop; pin that it still rejects the second.
insert into public.invoices (id, client_id, estimate_id)
  values ('cccccccc-0000-0000-0000-000000000041',
          'cccccccc-0000-0000-0000-000000000001',
          'cccccccc-0000-0000-0000-000000000021');
select pg_temp.expect_unique_violation(
  $q$ insert into public.invoices (id, client_id, estimate_id)
      values ('cccccccc-0000-0000-0000-000000000042',
              'cccccccc-0000-0000-0000-000000000001',
              'cccccccc-0000-0000-0000-000000000021') $q$,
  'CC-004: second invoice from the same estimate is rejected');

rollback;

\echo 'ALL COLD CASES STILL CLOSED'
