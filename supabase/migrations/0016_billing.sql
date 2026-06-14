-- 0016: SaaS billing seam — plans, per-org subscription, 14-day trial, and an
-- access gate. The Stripe wiring (Edge Functions) is written but dormant until
-- keys are configured; this migration is the data + gate it plugs into.

create table public.plans (
  id text primary key,                 -- 'pro_monthly' etc (maps to a Stripe price)
  name text not null,
  price_cents integer not null default 0,
  interval text not null default 'month' check (interval in ('month', 'year')),
  active boolean not null default true
);

insert into public.plans (id, name, price_cents, interval) values
  ('pro_monthly', 'Pro', 2900, 'month'),
  ('pro_yearly', 'Pro (yearly)', 29000, 'year');

create table public.subscriptions (
  org_id uuid primary key references public.organizations (id) on delete cascade,
  status text not null default 'trialing'
    check (status in ('trialing', 'active', 'past_due', 'canceled')),
  plan_id text references public.plans (id),
  trial_ends_at timestamptz,
  current_period_end timestamptz,
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger subscriptions_updated_at before update on public.subscriptions
  for each row execute function public.set_updated_at();

alter table public.plans enable row level security;
alter table public.subscriptions enable row level security;

-- Plans are a public catalog (any signed-in user can read them).
create policy "read plans" on public.plans for select to authenticated using (true);
-- A member can read their org's subscription; only the webhook (service role,
-- which bypasses RLS) ever writes it — no user-facing write policy.
create policy "read own subscription" on public.subscriptions
  for select using (org_id = public.current_org());

-- ── Signup now also opens a 14-day trial ────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
begin
  insert into public.organizations (name)
    values (coalesce(nullif(new.raw_user_meta_data ->> 'business_name', ''), 'My Business'))
    returning id into v_org;
  insert into public.memberships (org_id, user_id, role) values (v_org, new.id, 'owner');
  insert into public.business_settings (user_id, org_id) values (new.id, v_org);
  insert into public.subscriptions (org_id, status, trial_ends_at)
    values (v_org, 'trialing', now() + interval '14 days');
  return new;
end;
$$;

-- ── One round-trip the app gate uses: onboarded? has access? ────────────────
-- access = active subscription OR a trial that hasn't expired.
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
    (
      s.status = 'active'
      or (s.status = 'trialing' and (s.trial_ends_at is null or s.trial_ends_at > now()))
    ),
    s.status,
    s.trial_ends_at
  from public.business_settings bs
  left join public.subscriptions s on s.org_id = v_org
  where bs.org_id = v_org;
end;
$$;

grant execute on function public.app_state() to authenticated;
