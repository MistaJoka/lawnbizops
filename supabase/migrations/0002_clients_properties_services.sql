-- 0002: clients, properties, services catalog, per-property price overrides

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  name text not null,
  phone text not null default '',
  email text not null default '',
  notes text not null default '',
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.properties (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  label text not null default 'Home',
  address_line1 text not null default '',
  address_line2 text not null default '',
  city text not null default '',
  state text not null default 'FL',
  zip text not null default '',
  gate_code text not null default '',
  notes text not null default '',
  lat double precision,
  lng double precision,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  name text not null,
  description text not null default '',
  default_price_cents integer not null default 0,
  unit text not null default 'flat' check (unit in ('flat', 'hour', 'sqft', 'yard')),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.property_services (
  property_id uuid not null references public.properties (id) on delete cascade,
  service_id uuid not null references public.services (id) on delete cascade,
  user_id uuid not null default auth.uid(),
  price_cents integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (property_id, service_id)
);

create index properties_client_id_idx on public.properties (client_id);
create index clients_user_id_idx on public.clients (user_id);
create index properties_user_id_idx on public.properties (user_id);
create index services_user_id_idx on public.services (user_id);
create index property_services_user_id_idx on public.property_services (user_id);

create trigger clients_updated_at
  before update on public.clients
  for each row execute function public.set_updated_at();
create trigger properties_updated_at
  before update on public.properties
  for each row execute function public.set_updated_at();
create trigger services_updated_at
  before update on public.services
  for each row execute function public.set_updated_at();
create trigger property_services_updated_at
  before update on public.property_services
  for each row execute function public.set_updated_at();

alter table public.clients enable row level security;
alter table public.properties enable row level security;
alter table public.services enable row level security;
alter table public.property_services enable row level security;

create policy "own clients" on public.clients
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own properties" on public.properties
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own services" on public.services
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own property_services" on public.property_services
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
