-- 0027: expenses — the cost side of the cash-basis ledger ("money out").
--
-- Mirrors the org-scoped table template (0013): org_id defaults to current_org(),
-- a single org-membership policy, and the set_updated_at trigger. Table DML is
-- inherited from the default privileges set in 0023 (authenticated; RLS still
-- gates every row).
--
-- category is an open text column validated at the edge against the static
-- SCHEDULE_C_CATEGORIES list — no DB check, so the Schedule C mapping can evolve
-- without a migration. Money is integer cents; spent_on is a device-local date.

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null default public.current_org()
    references public.organizations (id) on delete cascade,
  user_id uuid default auth.uid(),
  category text not null default 'other',
  amount_cents integer not null default 0 check (amount_cents >= 0),
  spent_on date not null default current_date,
  vendor text not null default '',
  note text not null default '',
  payment_method text not null default 'other'
    check (payment_method in ('cash', 'check', 'card', 'transfer', 'other')),
  job_id uuid references public.jobs (id) on delete set null,
  client_id uuid references public.clients (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index expenses_org_idx on public.expenses (org_id);
create index expenses_spent_on_idx on public.expenses (spent_on desc);
create index expenses_job_idx on public.expenses (job_id);
create index expenses_client_idx on public.expenses (client_id);

create trigger expenses_updated_at before update on public.expenses
  for each row execute function public.set_updated_at();

alter table public.expenses enable row level security;

create policy "org members" on public.expenses for all
  using (org_id = public.current_org()) with check (org_id = public.current_org());

-- Receipts reuse the generic photos table (entity_type/entity_id) — widen its
-- check to allow 'expense' so uploadPhoto/usePhotos/deletePhoto work unchanged.
alter table public.photos drop constraint photos_entity_type_check;
alter table public.photos add constraint photos_entity_type_check
  check (entity_type in ('job', 'estimate', 'expense'));
