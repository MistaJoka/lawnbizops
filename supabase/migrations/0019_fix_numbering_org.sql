-- 0019: fix invoice/estimate numbering after the org re-key.
--
-- The numbering triggers (from 0006/0007) still looked up business_settings by
-- user_id with `on conflict (user_id)`, but 0012 re-keyed business_settings to
-- org_id and dropped the user_id PK — so the conflict target no longer exists
-- and any insert into invoices/estimates errored. Re-key the lookups to org_id
-- (each org has exactly one settings row, created by the signup trigger).

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
  insert into public.business_settings (org_id) values (new.org_id)
    on conflict (org_id) do nothing;
  update public.business_settings
    set next_invoice_number = next_invoice_number + 1
    where org_id = new.org_id
    returning invoice_prefix, next_invoice_number - 1 into pfx, n;
  new.number := pfx || n::text;
  return new;
end;
$$;

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
  insert into public.business_settings (org_id) values (new.org_id)
    on conflict (org_id) do nothing;
  update public.business_settings
    set next_estimate_number = next_estimate_number + 1
    where org_id = new.org_id
    returning estimate_prefix, next_estimate_number - 1 into pfx, n;
  new.number := pfx || n::text;
  return new;
end;
$$;
