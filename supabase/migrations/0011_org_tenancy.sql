-- 0011: multi-tenant foundation — ADDITIVE / non-breaking.
--
-- Adds organizations + memberships + current_org(), an org_id column on every
-- domain table backfilled to one seed org, and a signup trigger that
-- provisions a fresh org per new auth user. The temporary "anon (no-auth)"
-- policies REMAIN here so the deployed app keeps working unchanged — the
-- breaking switch to org-scoped RLS is a separate migration (0012).
--
-- Safe to apply to production: it only adds structures and backfills.

-- ── Tenant tables ──────────────────────────────────────────────────────────

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'My Business',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'owner' check (role in ('owner', 'admin', 'tech')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, user_id)
);
create index memberships_user_idx on public.memberships (user_id);
create index memberships_org_idx on public.memberships (org_id);

create trigger organizations_updated_at before update on public.organizations
  for each row execute function public.set_updated_at();
create trigger memberships_updated_at before update on public.memberships
  for each row execute function public.set_updated_at();

-- The tenant resolver used by every org-scoped RLS policy. SECURITY DEFINER so
-- it can read memberships WITHOUT invoking memberships' own RLS (that would
-- recurse). STABLE → evaluated once per statement. Single-login v1: a user has
-- exactly one membership, so this is unambiguous; multi-org later swaps this
-- for an explicit "active org" claim without touching the policies.
create or replace function public.current_org()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select org_id from public.memberships where user_id = auth.uid() limit 1
$$;

-- ── Seed org: adopts every row created while auth was off ────────────────────
insert into public.organizations (id, name)
  values ('00000000-0000-0000-0000-0000000000aa', 'Seed Org')
  on conflict (id) do nothing;

-- ── Add org_id to every domain table + backfill the seed org ────────────────
-- Nullable for now; 0012 makes it NOT NULL with a current_org() default.
do $$
declare
  t text;
  tables text[] := array[
    'clients', 'properties', 'services', 'property_services',
    'recurring_schedules', 'jobs', 'estimates', 'estimate_items',
    'invoices', 'invoice_items', 'payments', 'photos', 'inventory_items',
    'business_settings'
  ];
begin
  foreach t in array tables loop
    execute format(
      'alter table public.%I add column org_id uuid references public.organizations (id) on delete cascade',
      t
    );
    execute format(
      'update public.%I set org_id = ''00000000-0000-0000-0000-0000000000aa'' where org_id is null',
      t
    );
    execute format('create index %I on public.%I (org_id)', t || '_org_idx', t);
  end loop;
end $$;

-- business_settings is one row per tenant — key it by org so the app can
-- upsert on org_id (the user_id PK stays for now; 0012 finishes the re-key).
alter table public.business_settings add constraint business_settings_org_key unique (org_id);

-- ── Signup → provision a fresh org for the new user ─────────────────────────
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
  -- user_id satisfies the still-present PK; org_id is the real tenant key.
  insert into public.business_settings (user_id, org_id) values (new.id, v_org);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── RLS for the new tenant tables (additive; domain tables stay anon-open) ──
alter table public.organizations enable row level security;
alter table public.memberships enable row level security;

-- A user can see their own membership rows and the org(s) they belong to.
-- No INSERT/UPDATE/DELETE policy → only the SECURITY DEFINER signup trigger
-- writes memberships; users cannot self-join an arbitrary org.
create policy "see own memberships" on public.memberships
  for select using (user_id = auth.uid());

create policy "see own org" on public.organizations
  for select using (id = public.current_org());
create policy "rename own org" on public.organizations
  for update using (id = public.current_org()) with check (id = public.current_org());
