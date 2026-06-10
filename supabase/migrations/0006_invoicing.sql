-- 0006: invoices, line items, payments, numbering, balances, apply_payment

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid),
  client_id uuid not null references public.clients (id) on delete cascade,
  estimate_id uuid,                -- FK lands with estimates in Phase 4
  number text unique,              -- assigned by trigger when null (offline-created invoices get theirs at sync)
  status text not null default 'draft'
    check (status in ('draft', 'sent', 'partially_paid', 'paid', 'void')),
  issued_at date not null default current_date,
  due_at date,
  notes text not null default '',
  last_reminded_at timestamptz,    -- gentle-collections: never double-nudge
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid),
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  job_id uuid references public.jobs (id) on delete set null,
  description text not null,
  quantity numeric(10, 2) not null default 1,
  unit_price_cents integer not null default 0,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid),
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  amount_cents integer not null check (amount_cents > 0),
  method text not null check (method in ('cash', 'check', 'zelle', 'card_external', 'other')),
  paid_at date not null default current_date,
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index invoices_client_idx on public.invoices (client_id);
create index invoices_user_idx on public.invoices (user_id);
create index invoice_items_invoice_idx on public.invoice_items (invoice_id);
create index invoice_items_user_idx on public.invoice_items (user_id);
create index payments_invoice_idx on public.payments (invoice_id);
create index payments_user_idx on public.payments (user_id);

create trigger invoices_updated_at
  before update on public.invoices
  for each row execute function public.set_updated_at();
create trigger invoice_items_updated_at
  before update on public.invoice_items
  for each row execute function public.set_updated_at();
create trigger payments_updated_at
  before update on public.payments
  for each row execute function public.set_updated_at();

alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;
alter table public.payments enable row level security;

create policy "own invoices" on public.invoices
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own invoice_items" on public.invoice_items
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own payments" on public.payments
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "anon access (temp no-auth)" on public.invoices
  for all to anon using (true) with check (true);
create policy "anon access (temp no-auth)" on public.invoice_items
  for all to anon using (true) with check (true);
create policy "anon access (temp no-auth)" on public.payments
  for all to anon using (true) with check (true);

-- Sequential human-friendly numbers (INV-1, INV-2 …) from business_settings.
create or replace function public.assign_invoice_number()
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
    set next_invoice_number = next_invoice_number + 1
    where user_id = new.user_id
    returning invoice_prefix, next_invoice_number - 1 into pfx, n;
  new.number := pfx || n::text;
  return new;
end;
$$;

create trigger invoices_assign_number
  before insert on public.invoices
  for each row execute function public.assign_invoice_number();

-- Totals are computed, never stored.
create view public.invoice_balances
with (security_invoker = true) as
select
  i.id as invoice_id,
  i.user_id,
  i.client_id,
  i.number,
  i.status,
  i.issued_at,
  i.due_at,
  i.last_reminded_at,
  coalesce(items.total_cents, 0) as total_cents,
  coalesce(pays.paid_cents, 0) as paid_cents,
  coalesce(items.total_cents, 0) - coalesce(pays.paid_cents, 0) as balance_cents
from public.invoices i
left join (
  select invoice_id, sum(round(quantity * unit_price_cents))::integer as total_cents
  from public.invoice_items group by invoice_id
) items on items.invoice_id = i.id
left join (
  select invoice_id, sum(amount_cents)::integer as paid_cents
  from public.payments group by invoice_id
) pays on pays.invoice_id = i.id;

-- Insert a payment and flip invoice status atomically. p_id makes outbox
-- retries idempotent (a lost response must not double-record a payment).
create or replace function public.apply_payment(
  p_id uuid,
  p_invoice_id uuid,
  p_amount_cents integer,
  p_method text,
  p_paid_at date default current_date,
  p_note text default ''
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  total integer;
  paid integer;
begin
  insert into public.payments (id, invoice_id, amount_cents, method, paid_at, note)
  values (p_id, p_invoice_id, p_amount_cents, p_method, p_paid_at, p_note)
  on conflict (id) do nothing;

  select total_cents, paid_cents into total, paid
    from public.invoice_balances where invoice_id = p_invoice_id;

  update public.invoices
    set status = case
      when paid >= total and total > 0 then 'paid'
      when paid > 0 then 'partially_paid'
      else status
    end
    where id = p_invoice_id and status <> 'void';
end;
$$;
