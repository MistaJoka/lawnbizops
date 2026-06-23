-- 0030: tax-prep helpers — Schedule C set-up, mileage log, 1099 payees.
--
-- Cash-basis, lightweight. Current-year IRS figures (mileage rate, quarterly
-- due dates, 1099 thresholds) are NOT hardcoded here — the mileage rate and
-- set-aside % are user-entered settings (default 0, "confirm current value" in
-- the UI). org-scoped template per 0013; DML inherited from 0023.

-- Tax fields on the existing per-org settings singleton (not a new table).
alter table public.business_settings
  add column tax_id text not null default '',
  add column business_entity text not null default 'sole_prop'
    check (business_entity in ('sole_prop', 'llc', 's_corp', 'c_corp', 'partnership')),
  add column mileage_rate_cents integer not null default 0 check (mileage_rate_cents >= 0),
  add column quarterly_set_aside_pct numeric(5, 2) not null default 0
    check (quarterly_set_aside_pct >= 0 and quarterly_set_aside_pct <= 100);

-- 1099 payees (contractors/vendors you may need to file a 1099-NEC for).
create table public.vendors_1099 (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null default public.current_org()
    references public.organizations (id) on delete cascade,
  user_id uuid default auth.uid(),
  name text not null,
  tax_id text not null default '',
  address text not null default '',
  email text not null default '',
  track_1099 boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index vendors_1099_org_idx on public.vendors_1099 (org_id);

create trigger vendors_1099_updated_at before update on public.vendors_1099
  for each row execute function public.set_updated_at();

alter table public.vendors_1099 enable row level security;
create policy "org members" on public.vendors_1099 for all
  using (org_id = public.current_org()) with check (org_id = public.current_org());

-- Tag an expense to a 1099 payee — the annual total per payee = sum of these.
alter table public.expenses
  add column payee_id uuid references public.vendors_1099 (id) on delete set null;
create index expenses_payee_idx on public.expenses (payee_id);

-- Mileage log — deduction (miles * rate) is computed at the edge, never stored.
create table public.mileage_logs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null default public.current_org()
    references public.organizations (id) on delete cascade,
  user_id uuid default auth.uid(),
  drove_on date not null default current_date,
  miles numeric(10, 1) not null default 0 check (miles >= 0),
  purpose text not null default '',
  job_id uuid references public.jobs (id) on delete set null,
  client_id uuid references public.clients (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index mileage_logs_org_idx on public.mileage_logs (org_id);
create index mileage_logs_drove_on_idx on public.mileage_logs (drove_on desc);
create index mileage_logs_job_idx on public.mileage_logs (job_id);
create index mileage_logs_client_idx on public.mileage_logs (client_id);

create trigger mileage_logs_updated_at before update on public.mileage_logs
  for each row execute function public.set_updated_at();

alter table public.mileage_logs enable row level security;
create policy "org members" on public.mileage_logs for all
  using (org_id = public.current_org()) with check (org_id = public.current_org());
