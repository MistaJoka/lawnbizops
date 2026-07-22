-- =============================================================================
-- automation_sweep.sql — behavior tests for the nightly sweep's task rules
-- (0039: unbilled finished work + missed jobs), including dedup/re-arm.
--
-- Run against a seeded local stack (after invariants.sql, same harness):
--   psql ... -v ON_ERROR_STOP=1 -f supabase/tests/automation_sweep.sql
-- A FAIL raises and aborts (ON_ERROR_STOP). Test rows are created under the
-- seed org and cleaned up at the end so invariants stay valid either way.
-- =============================================================================

create or replace function pg_temp.assert(cond boolean, label text)
  returns void language plpgsql as $$
begin
  if cond then raise notice 'PASS: %', label;
  else raise exception 'FAIL: %', label; end if;
end $$;

-- Seed-org context (the demo user's org, provisioned by the signup trigger).
create table pg_temp.ctx as
select org_id, user_id
from public.memberships
where user_id = 'b0000000-0000-4000-a000-000000000002';

select pg_temp.assert((select count(*) = 1 from pg_temp.ctx), 'seed org resolves');

-- Fixture: one client/property with (a) a done job finished 3 days ago that no
-- invoice picked up, and (b) a job still `scheduled` 5 days in the past.
insert into public.clients (id, org_id, user_id, name, stage)
select 'aaaa0039-0000-4000-a000-000000000001', org_id, user_id, 'Sweep Test Client', 'active' from pg_temp.ctx;

insert into public.properties (id, org_id, user_id, client_id, label, address_line1)
select 'aaaa0039-0000-4000-a000-000000000002', org_id, user_id, 'aaaa0039-0000-4000-a000-000000000001', 'Yard', '1 Test Ln' from pg_temp.ctx;

insert into public.jobs (id, org_id, user_id, property_id, title, scheduled_date, status, price_cents, completed_at)
select 'aaaa0039-0000-4000-a000-000000000003', org_id, user_id, 'aaaa0039-0000-4000-a000-000000000002',
       'Unbilled mow', current_date - 3, 'done', 6500, now() - interval '3 days' from pg_temp.ctx;

insert into public.jobs (id, org_id, user_id, property_id, title, scheduled_date, status, price_cents)
select 'aaaa0039-0000-4000-a000-000000000004', org_id, user_id, 'aaaa0039-0000-4000-a000-000000000002',
       'Forgotten hedge trim', current_date - 5, 'scheduled', 9500 from pg_temp.ctx;

-- Control: a fresh done job INSIDE the 48h grace window must NOT create a task.
insert into public.jobs (id, org_id, user_id, property_id, title, scheduled_date, status, price_cents, completed_at)
select 'aaaa0039-0000-4000-a000-000000000005', org_id, user_id, 'aaaa0039-0000-4000-a000-000000000002',
       'Fresh mow', current_date, 'done', 6000, now() - interval '2 hours' from pg_temp.ctx;

-- ── Sweep #1: both tasks appear ─────────────────────────────────────────────
select public.automation_sweep();

select pg_temp.assert(
  (select count(*) = 1 from public.tasks
     where client_id = 'aaaa0039-0000-4000-a000-000000000001'
       and title = 'Invoice finished work — Sweep Test Client' and not done),
  'unbilled work creates one task per client');

select pg_temp.assert(
  (select count(*) = 1 from public.tasks
     where client_id = 'aaaa0039-0000-4000-a000-000000000001'
       and title like 'Missed: Forgotten hedge trim (%'),
  'missed scheduled job creates one task');

select pg_temp.assert(
  (select count(*) = 2 from public.tasks
     where client_id = 'aaaa0039-0000-4000-a000-000000000001'),
  'grace-window job creates no task (exactly two tasks total)');

-- ── Sweep #2: idempotent — nothing duplicates ───────────────────────────────
select public.automation_sweep();

select pg_temp.assert(
  (select count(*) = 2 from public.tasks
     where client_id = 'aaaa0039-0000-4000-a000-000000000001'),
  'second sweep run creates no duplicate tasks');

-- ── Re-arm: unbilled task checked off, work still unbilled → new task ───────
update public.tasks set done = true
  where client_id = 'aaaa0039-0000-4000-a000-000000000001'
    and title = 'Invoice finished work — Sweep Test Client';

select public.automation_sweep();

select pg_temp.assert(
  (select count(*) = 1 from public.tasks
     where client_id = 'aaaa0039-0000-4000-a000-000000000001'
       and title = 'Invoice finished work — Sweep Test Client' and not done),
  'unbilled rule re-arms after the task is checked off while work stays unbilled');

-- Missed-job dedup is once-ever: still exactly one missed task.
select pg_temp.assert(
  (select count(*) = 1 from public.tasks
     where client_id = 'aaaa0039-0000-4000-a000-000000000001'
       and title like 'Missed: Forgotten hedge trim (%'),
  'missed-job task stays once-ever across sweeps');

-- ── Cleanup: remove fixture rows so later suites see the pristine seed ──────
delete from public.tasks where client_id = 'aaaa0039-0000-4000-a000-000000000001';
delete from public.jobs where id in (
  'aaaa0039-0000-4000-a000-000000000003',
  'aaaa0039-0000-4000-a000-000000000004',
  'aaaa0039-0000-4000-a000-000000000005');
delete from public.properties where id = 'aaaa0039-0000-4000-a000-000000000002';
delete from public.clients where id = 'aaaa0039-0000-4000-a000-000000000001';
