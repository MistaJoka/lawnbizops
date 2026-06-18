-- RLS isolation test — run against a stack with 0001..0012 applied.
-- Seeds two tenants and asserts neither can see, mutate, or detect the other's
-- rows across representative tables. Wrapped in a transaction + rollback, so it
-- leaves no trace. Any leak raises an exception → psql exits non-zero.
--
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/rls_isolation.sql

begin;

-- Provision two tenants via the signup trigger (handle_new_user).
insert into auth.users (instance_id, id, aud, role, email, raw_user_meta_data)
values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111',
   'authenticated', 'authenticated', 'alpha@test.dev', '{"business_name":"Alpha Lawns"}'),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222',
   'authenticated', 'authenticated', 'bravo@test.dev', '{"business_name":"Bravo Yard"}');

-- Capture Alpha's org id as the superuser running this script (pre-RLS), so the
-- later cross-org forgery attempt has a concrete target to aim at.
select org_id as alpha_org from public.memberships
  where user_id = '11111111-1111-1111-1111-111111111111' \gset

-- Helper: become a given user for RLS evaluation.
create or replace function pg_temp.become(uid text) returns void
language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
end $$;

create or replace function pg_temp.assert(cond boolean, msg text) returns void
language plpgsql as $$
begin
  if not cond then raise exception 'RLS LEAK ❌ %', msg; end if;
end $$;

-- Helper: assert a statement is REJECTED (RLS with-check or missing grant).
-- Swallows the DB error; if the statement unexpectedly SUCCEEDS, that's a leak.
create or replace function pg_temp.expect_denied(stmt text, msg text) returns void
language plpgsql as $$
begin
  execute stmt;
  raise exception 'RLS LEAK ❌ %', msg;
exception
  -- 42501 = the row-level-security with-check failure OR a missing table/function
  -- grant. That's the ONLY acceptable outcome — anything else (bad SQL, NULL
  -- target) is a broken test and must surface, not silently "pass".
  when insufficient_privilege then null;
end $$;

-- ── As Alpha: signup trigger should have provisioned exactly one org + one
--    business_settings row; create a client + a job's worth of data. ─────────
select pg_temp.become('11111111-1111-1111-1111-111111111111');

select pg_temp.assert((select count(*) from public.organizations) = 1, 'Alpha should see exactly 1 org');
select pg_temp.assert((select count(*) from public.business_settings) = 1, 'Alpha should see 1 settings row');

insert into public.clients (id, name) values ('aaaaaaaa-0000-0000-0000-000000000001', 'Alpha Client');
insert into public.inventory_items (id, name, quantity, reorder_level)
  values ('aaaaaaaa-0000-0000-0000-000000000002', 'Alpha Mulch', 5, 10);
select pg_temp.assert((select count(*) from public.clients) = 1, 'Alpha should see its own client');
select pg_temp.assert(
  (select org_id from public.clients where name = 'Alpha Client') = public.current_org(),
  'Alpha client org_id should be stamped from session'
);

-- ── As Bravo: must see NONE of Alpha's data, cannot mutate it. ──────────────
select pg_temp.become('22222222-2222-2222-2222-222222222222');

select pg_temp.assert((select count(*) from public.clients) = 0, 'Bravo must NOT see Alpha clients');
select pg_temp.assert((select count(*) from public.inventory_items) = 0, 'Bravo must NOT see Alpha inventory');
select pg_temp.assert((select count(*) from public.business_settings) = 1, 'Bravo sees only its own settings');
select pg_temp.assert(
  (select count(*) from public.organizations) = 1, 'Bravo sees only its own org'
);

insert into public.clients (id, name) values ('bbbbbbbb-0000-0000-0000-000000000001', 'Bravo Client');

-- Write-side: Bravo must NOT be able to forge a row stamped into Alpha's org.
-- The `with check (org_id = current_org())` policy must reject this.
select pg_temp.expect_denied(
  format(
    $f$insert into public.clients (id, name, org_id) values (%L, %L, %L)$f$,
    'cccccccc-0000-0000-0000-000000000001',
    'Forged into Alpha',
    :'alpha_org'
  ),
  'Bravo forged a client into Alpha''s org (with-check policy failed)'
);

-- RLS makes the row invisible, so the UPDATE matches 0 rows (silent no-op).
update public.clients set name = 'HACKED' where id = 'aaaaaaaa-0000-0000-0000-000000000001';
delete from public.clients where id = 'aaaaaaaa-0000-0000-0000-000000000001';

-- ── Back as Alpha: data intact, still can't see Bravo. ─────────────────────
select pg_temp.become('11111111-1111-1111-1111-111111111111');

select pg_temp.assert((select count(*) from public.clients) = 1, 'Alpha must still have exactly its 1 client');
select pg_temp.assert(
  (select name from public.clients where id = 'aaaaaaaa-0000-0000-0000-000000000001') = 'Alpha Client',
  'Bravo must NOT have mutated or deleted Alpha client'
);
select pg_temp.assert(
  not exists (select 1 from public.clients where name = 'Bravo Client'),
  'Alpha must NOT see Bravo client'
);

-- ── As anon (no session): post-cutover (0012 + 0025), anon has zero access. ──
select set_config('role', 'anon', true);
select set_config('request.jwt.claims', '{"role":"anon"}', true);

select pg_temp.expect_denied(
  'select count(*) from public.clients',
  'anon can read clients'
);
select pg_temp.expect_denied(
  $f$insert into public.clients (id, name) values ('dddddddd-0000-0000-0000-000000000001', 'Anon')$f$,
  'anon can insert a client'
);

rollback;

\echo '════════════════════════════════════'
\echo '  RLS ISOLATION TEST: PASS ✅'
\echo '════════════════════════════════════'
