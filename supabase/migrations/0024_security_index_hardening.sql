-- 0024: security + index hardening (advisor findings, no schema-shape change).
--
-- 1. SECURITY DEFINER exposure. 0017/0020 tried to lock these down with
--    `revoke ... from anon, authenticated`, but that's a no-op against the
--    default `GRANT EXECUTE TO PUBLIC` that CREATE OR REPLACE FUNCTION re-adds.
--    has_function_privilege('anon', ...) stays true via PUBLIC. The effective
--    fix is to revoke from PUBLIC, then grant back only the roles that need it.
-- 2. memberships RLS re-evaluated auth.uid() per row (initplan) — wrap in a
--    scalar subselect so it's evaluated once.
-- 3. Add covering indexes for unindexed foreign keys; drop dead legacy
--    user_id indexes left over from the pre-org-tenancy era.

-- --- 1. Lock down SECURITY DEFINER execute grants ----------------------------

-- Supabase's default privileges grant EXECUTE to anon directly (not only via
-- PUBLIC) on every public function, so strip public + anon + authenticated and
-- grant back explicitly. App-facing: the gate + org resolver run as
-- `authenticated` on every navigation (current_org() is also invoked by org_id
-- DEFAULTs and RLS).
revoke execute on function public.app_state() from public, anon, authenticated;
revoke execute on function public.current_org() from public, anon, authenticated;
grant execute on function public.app_state() to authenticated, service_role;
grant execute on function public.current_org() to authenticated, service_role;

-- Cron-only (run by pg_cron as the superuser owner — no client role needs them).
revoke execute on function public.automation_sweep() from public, anon, authenticated;
revoke execute on function public.materialize_jobs_all() from public, anon, authenticated;

-- Trigger-only (fire as the table owner; triggers don't check EXECUTE, so no
-- client role ever needs to call these directly).
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.job_done_followup() from public, anon, authenticated;

-- --- 2. RLS initplan: evaluate auth.uid() once -------------------------------

drop policy if exists "see own memberships" on public.memberships;
create policy "see own memberships" on public.memberships
  for select using (user_id = (select auth.uid()));

-- --- 3a. Covering indexes for unindexed foreign keys -------------------------

create index if not exists activities_job_idx on public.activities (job_id);
create index if not exists estimates_property_idx on public.estimates (property_id);
create index if not exists invoice_items_job_idx on public.invoice_items (job_id);
create index if not exists invoices_estimate_idx on public.invoices (estimate_id);
create index if not exists jobs_service_idx on public.jobs (service_id);
create index if not exists property_services_service_idx
  on public.property_services (service_id);
create index if not exists recurring_schedules_service_idx
  on public.recurring_schedules (service_id);
create index if not exists subscriptions_plan_idx on public.subscriptions (plan_id);
create index if not exists tasks_client_idx on public.tasks (client_id);

-- --- 3b. Drop dead legacy user_id indexes (RLS filters on org_id now) --------
-- Keep memberships_user_idx: current_org() reads memberships by user_id.

drop index if exists public.recurring_schedules_user_idx;
drop index if exists public.jobs_user_idx;
drop index if exists public.properties_user_id_idx;
drop index if exists public.services_user_id_idx;
drop index if exists public.property_services_user_id_idx;
drop index if exists public.invoices_user_idx;
drop index if exists public.invoice_items_user_idx;
drop index if exists public.payments_user_idx;
drop index if exists public.estimates_user_idx;
drop index if exists public.estimate_items_user_idx;
drop index if exists public.photos_user_idx;
drop index if exists public.inventory_items_user_idx;
