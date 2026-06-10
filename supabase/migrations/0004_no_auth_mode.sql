-- 0004: temporary no-auth mode (user decision 2026-06-10 — login screen later).
-- RLS stays ENABLED. We add permissive anon policies alongside the existing
-- "own X" authenticated policies, and default user_id to a fixed placeholder
-- when there is no session. Re-enabling auth later = drop the anon policies,
-- reassign placeholder rows to the real user, restore the auth.uid() default.

-- Fixed placeholder owner for rows created without a session.
do $$
begin
  -- (documentation marker only; the uuid is referenced in defaults below)
end $$;

alter table public.business_settings
  alter column user_id set default coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid);
alter table public.clients
  alter column user_id set default coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid);
alter table public.properties
  alter column user_id set default coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid);
alter table public.services
  alter column user_id set default coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid);
alter table public.property_services
  alter column user_id set default coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid);

create policy "anon access (temp no-auth)" on public.business_settings
  for all to anon using (true) with check (true);
create policy "anon access (temp no-auth)" on public.clients
  for all to anon using (true) with check (true);
create policy "anon access (temp no-auth)" on public.properties
  for all to anon using (true) with check (true);
create policy "anon access (temp no-auth)" on public.services
  for all to anon using (true) with check (true);
create policy "anon access (temp no-auth)" on public.property_services
  for all to anon using (true) with check (true);
