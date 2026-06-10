-- 0001_init: foundation — updated_at helper + business_settings
-- Conventions (all future tables follow):
--   * uuid PKs default gen_random_uuid() (client-generatable for offline inserts)
--   * money as integer cents
--   * user_id default auth.uid() + RLS on every table
--   * statuses as text + check constraints
--   * created_at/updated_at timestamptz, updated_at via trigger

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.business_settings (
  user_id uuid primary key default auth.uid(),
  business_name text not null default '',
  phone text not null default '',
  email text not null default '',
  address text not null default '',
  logo_path text,
  invoice_prefix text not null default 'INV-',
  next_invoice_number integer not null default 1,
  estimate_prefix text not null default 'EST-',
  next_estimate_number integer not null default 1,
  payment_provider text check (payment_provider in ('square', 'paypal')),
  payment_provider_config jsonb not null default '{}'::jsonb,
  default_due_days integer not null default 14,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger business_settings_updated_at
  before update on public.business_settings
  for each row execute function public.set_updated_at();

alter table public.business_settings enable row level security;

create policy "own settings" on public.business_settings
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
