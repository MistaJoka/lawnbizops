-- 0037: reminder emails from the daily automation sweep (opt-in per org).
--
-- Two new rules ride the existing 07:15 automation_sweep cron, writing to the
-- email_outbox (0036) that the send-email worker drains:
--   * overdue invoice  → invoice_overdue email (7-day re-nudge window via
--     last_reminded_at, which the worker stamps on send — cooperating with the
--     manual "Friendly reminder" flow that stamps the same column)
--   * today's visits   → job_reminder email at sweep time
-- Both are failure-isolated (0022's lesson: an automation must never break its
-- host) and hard-deduped by the (template, entity_id, send_date) unique index.

alter table public.business_settings
  add column email_overdue_reminders boolean not null default false,
  add column email_appointment_reminders boolean not null default false;

create or replace function public.automation_sweep()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
  v_title text;
  total integer := 0;
begin
  -- Rule 1 (0020): overdue invoice → in-app "Send reminder" task, once ever.
  for r in
    select i.id, i.number, i.client_id, i.org_id
    from public.invoices i
    join public.business_settings bs on bs.org_id = i.org_id
    where bs.auto_overdue_reminder
      and i.status in ('sent', 'partially_paid')
      and i.due_at is not null
      and i.due_at < current_date - (bs.auto_overdue_days || ' days')::interval
      and exists (
        select 1 from public.invoice_balances ib
        where ib.invoice_id = i.id and ib.balance_cents > 0
      )
  loop
    v_title := 'Send reminder for ' || coalesce(r.number, 'invoice');
    if not exists (
      select 1 from public.tasks t
      where t.client_id = r.client_id and t.title = v_title
    ) then
      insert into public.tasks (org_id, client_id, title, due_date)
        values (r.org_id, r.client_id, v_title, current_date);
      total := total + 1;
    end if;
  end loop;

  -- Rule 2: overdue invoice → reminder email (opt-in; 7-day re-nudge).
  begin
    insert into public.email_outbox (id, org_id, template, entity_id, to_email)
    select gen_random_uuid(), i.org_id, 'invoice_overdue', i.id, c.email
    from public.invoices i
    join public.business_settings bs on bs.org_id = i.org_id
    join public.clients c on c.id = i.client_id
    where bs.email_overdue_reminders
      and i.status in ('sent', 'partially_paid')
      and i.due_at is not null
      and i.due_at < current_date - (bs.auto_overdue_days || ' days')::interval
      and coalesce(c.email, '') <> ''
      and (i.last_reminded_at is null or i.last_reminded_at < now() - interval '7 days')
      and exists (
        select 1 from public.invoice_balances ib
        where ib.invoice_id = i.id and ib.balance_cents > 0
      )
    on conflict do nothing;
  exception
    when others then null; -- email rule must never break the sweep
  end;

  -- Rule 3: today's scheduled visits → appointment email (opt-in).
  begin
    insert into public.email_outbox (id, org_id, template, entity_id, to_email)
    select gen_random_uuid(), j.org_id, 'job_reminder', j.id, c.email
    from public.jobs j
    join public.business_settings bs on bs.org_id = j.org_id
    join public.properties p on p.id = j.property_id
    join public.clients c on c.id = p.client_id
    where bs.email_appointment_reminders
      and j.status = 'scheduled'
      and j.scheduled_date = current_date
      and coalesce(c.email, '') <> ''
    on conflict do nothing;
  exception
    when others then null;
  end;

  return total;
end;
$$;

revoke execute on function public.automation_sweep() from anon, authenticated;
