-- 0010: field tools + inventory + job scheduling extras from Field Hardened mocks

alter table public.properties
  add column property_type text not null default 'residential'
    check (property_type in ('residential', 'commercial'));

alter table public.jobs
  add column start_time text not null default '',
  add column checklist jsonb not null default '[]'::jsonb;

create table public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid),
  name text not null,
  category text not null default 'general',
  unit text not null default 'each',
  quantity numeric not null default 0 check (quantity >= 0),
  reorder_level numeric not null default 0 check (reorder_level >= 0),
  location text not null default '',
  notes text not null default '',
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index inventory_items_user_idx on public.inventory_items (user_id);
create index inventory_items_archived_idx on public.inventory_items (archived_at);

create trigger inventory_items_updated_at
  before update on public.inventory_items
  for each row execute function public.set_updated_at();

alter table public.inventory_items enable row level security;

create policy "own inventory_items" on public.inventory_items
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "anon access (temp no-auth)" on public.inventory_items
  for all to anon using (true) with check (true);
