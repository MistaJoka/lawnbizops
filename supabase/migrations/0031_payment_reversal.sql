-- 0031: reversible payments via offsetting negative lines
--
-- A mis-keyed payment (wrong amount/method) had no fix but voiding the whole
-- invoice — losing its number and history. Instead we append an offsetting
-- *negative* payment line through the existing apply_payment RPC, which sums all
-- rows from invoice_balances. paid drops, balance is restored, status reverts —
-- append-only and fully auditable (the original row is never deleted).
--
-- Two changes:
--   1. Relax the amount check from `> 0` to `<> 0` so offsetting lines are legal.
--   2. Teach apply_payment to revert to 'sent' when paid falls back to <= 0. The
--      old recompute ended in `else status`, which (correct for forward-only
--      payments) would have left a fully reversed invoice stuck at 'paid'.

alter table public.payments
  drop constraint if exists payments_amount_cents_check;
alter table public.payments
  add constraint payments_amount_cents_check check (amount_cents <> 0);

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
      else 'sent'
    end
    where id = p_invoice_id and status <> 'void';
end;
$$;
