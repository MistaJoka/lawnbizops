-- 0040: trial expiry must not hard-lock users while billing is dormant.
--
-- The access gate (`app_state` → _authed redirect to /billing) is real, but
-- the pay path is not: the Stripe edge functions are undeployed/keyless, so an
-- expired trial strands a signed-up user on a "subscriptions aren't enabled
-- yet" screen with no way forward (audit P0-4, 2026-07-21).
--
-- Until Stripe goes live, `trialing` grants access regardless of
-- trial_ends_at. ⚠️ WHEN BILLING LAUNCHES: restore the expiry check
--   (s.status = 'trialing' and (s.trial_ends_at is null or s.trial_ends_at > now()))
-- in the same migration that configures the Stripe secrets, so the gate and
-- the pay path turn on together.

create or replace function public.app_state()
returns table (
  onboarded boolean,
  access boolean,
  status text,
  trial_ends_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_org uuid := public.current_org();
begin
  return query
  select
    (bs.onboarded_at is not null),
    coalesce(s.status in ('active', 'trialing'), false),
    s.status,
    s.trial_ends_at
  from public.business_settings bs
  left join public.subscriptions s on s.org_id = v_org
  where bs.org_id = v_org;
end;
$$;

grant execute on function public.app_state() to authenticated;
