-- 0007: estimates, estimate items, photos + storage bucket

create table public.estimates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid),
  client_id uuid not null references public.clients (id) on delete cascade,
  property_id uuid references public.properties (id) on delete set null,
  number text unique,              -- EST-n via trigger
  status text not null default 'draft'
    check (status in ('draft', 'sent', 'accepted', 'declined', 'expired')),
  issued_at date not null default current_date,
  valid_until date,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.estimate_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid),
  estimate_id uuid not null references public.estimates (id) on delete cascade,
  description text not null,
  quantity numeric(10, 2) not null default 1,
  unit_price_cents integer not null default 0,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid),
  entity_type text not null check (entity_type in ('job', 'estimate')),
  entity_id uuid not null,
  storage_path text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.invoices
  add constraint invoices_estimate_id_fkey
  foreign key (estimate_id) references public.estimates (id) on delete set null;

create index estimates_client_idx on public.estimates (client_id);
create index estimates_user_idx on public.estimates (user_id);
create index estimate_items_estimate_idx on public.estimate_items (estimate_id);
create index estimate_items_user_idx on public.estimate_items (user_id);
create index photos_entity_idx on public.photos (entity_type, entity_id);
create index photos_user_idx on public.photos (user_id);

create trigger estimates_updated_at
  before update on public.estimates
  for each row execute function public.set_updated_at();
create trigger estimate_items_updated_at
  before update on public.estimate_items
  for each row execute function public.set_updated_at();
create trigger photos_updated_at
  before update on public.photos
  for each row execute function public.set_updated_at();

alter table public.estimates enable row level security;
alter table public.estimate_items enable row level security;
alter table public.photos enable row level security;

create policy "own estimates" on public.estimates
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own estimate_items" on public.estimate_items
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own photos" on public.photos
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "anon access (temp no-auth)" on public.estimates
  for all to anon using (true) with check (true);
create policy "anon access (temp no-auth)" on public.estimate_items
  for all to anon using (true) with check (true);
create policy "anon access (temp no-auth)" on public.photos
  for all to anon using (true) with check (true);

create or replace function public.assign_estimate_number()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  pfx text;
  n integer;
begin
  if new.number is not null then
    return new;
  end if;
  insert into public.business_settings (user_id) values (new.user_id)
    on conflict (user_id) do nothing;
  update public.business_settings
    set next_estimate_number = next_estimate_number + 1
    where user_id = new.user_id
    returning estimate_prefix, next_estimate_number - 1 into pfx, n;
  new.number := pfx || n::text;
  return new;
end;
$$;

create trigger estimates_assign_number
  before insert on public.estimates
  for each row execute function public.assign_estimate_number();

-- Private photos bucket + anon object policies (temp no-auth mode)
insert into storage.buckets (id, name, public)
  values ('photos', 'photos', false)
  on conflict (id) do nothing;

create policy "anon photos all (temp no-auth)" on storage.objects
  for all to anon
  using (bucket_id = 'photos')
  with check (bucket_id = 'photos');
create policy "auth photos all" on storage.objects
  for all to authenticated
  using (bucket_id = 'photos')
  with check (bucket_id = 'photos');
