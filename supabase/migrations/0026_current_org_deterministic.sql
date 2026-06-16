-- 0026: make current_org() deterministic for multi-org users.
--
-- The original `select org_id … limit 1` has no ORDER BY, so once a user belongs
-- to 2+ orgs (the multi-user / team seam this app is built toward) the org a
-- session acts as is arbitrary and can flip between calls — every RLS check and
-- org-stamped insert rides on this. Pin it to the oldest membership: stable, and
-- a sensible "home" org until an explicit active-org switch is added later.
create or replace function public.current_org()
  returns uuid
  language sql
  stable
  security definer
  set search_path to ''
as $$
  select org_id from public.memberships
   where user_id = auth.uid()
   order by created_at, org_id
   limit 1
$$;

-- CREATE OR REPLACE FUNCTION resets EXECUTE back to PUBLIC, which would undo the
-- 0024 lockdown and re-expose current_org to anon. Re-apply least privilege.
revoke execute on function public.current_org() from public, anon, authenticated;
grant execute on function public.current_org() to authenticated, service_role;
