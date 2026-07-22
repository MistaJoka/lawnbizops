-- 0043: seasonal holds that end themselves — pause a schedule until a date.
--
-- Whole-schedule pause (paused_at) was all-or-nothing: stop materializing and
-- remember to come back. Nobody remembers — a paused mow schedule is silent
-- revenue loss. This adds an optional auto-resume date:
--   * recurring_schedules.resume_on (date, null = paused indefinitely)
--   * Rule 8 on the 07:15 automation_sweep clears the pause once the day
--     arrives; the next materialize pass (nightly 07:00 or app-open) refills
--     the visits. Setting/clearing the date rides the normal pause flow
--     (setSchedulePaused) — no new write path.
--
-- Rules 1-7 are unchanged from 0041/0039/0037/0020.

alter table public.recurring_schedules
  add column resume_on date;

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

  -- Rule 2 (0037): overdue invoice → reminder email (opt-in; 7-day re-nudge).
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

  -- Rule 3 (0037): today's scheduled visits → appointment email (opt-in).
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

  -- Rule 4 (0039): unbilled finished work → one task per client. Re-arms after
  -- the previous task is done but the work is still unbilled (`not t.done`).
  begin
    for r in
      select p.client_id, c.name, j.org_id
      from public.jobs j
      join public.properties p on p.id = j.property_id
      join public.clients c on c.id = p.client_id
      where j.status = 'done'
        and j.price_cents > 0
        and j.completed_at is not null
        and j.completed_at < now() - interval '48 hours'
      group by p.client_id, c.name, j.org_id
    loop
      v_title := 'Invoice finished work — ' || coalesce(r.name, 'client');
      if not exists (
        select 1 from public.tasks t
        where t.client_id = r.client_id and t.title = v_title and not t.done
      ) then
        insert into public.tasks (org_id, client_id, title, due_date)
          values (r.org_id, r.client_id, v_title, current_date);
        total := total + 1;
      end if;
    end loop;
  exception
    when others then null;
  end;

  -- Rule 5 (0039): missed job (still `scheduled` past its day) → one task per
  -- occurrence, once ever (title carries the date), 30-day lookback.
  begin
    for r in
      select j.id, j.title, j.scheduled_date, j.org_id, p.client_id
      from public.jobs j
      join public.properties p on p.id = j.property_id
      where j.status = 'scheduled'
        and j.scheduled_date < current_date
        and j.scheduled_date >= current_date - 30
    loop
      v_title := 'Missed: ' || coalesce(nullif(r.title, ''), 'job')
        || ' (' || to_char(r.scheduled_date, 'Mon DD') || ')';
      if not exists (
        select 1 from public.tasks t
        where t.client_id = r.client_id and t.title = v_title
      ) then
        insert into public.tasks (org_id, client_id, title, due_date)
          values (r.org_id, r.client_id, v_title, current_date);
        total := total + 1;
      end if;
    end loop;
  exception
    when others then null;
  end;

  -- Rule 6 (0041): expire stale quotes — persist what the UI already displays.
  -- Runs before Rule 7 so a just-expired quote never also gets a follow-up.
  begin
    update public.estimates
    set status = 'expired'
    where status = 'sent'
      and valid_until is not null
      and valid_until < current_date;
  exception
    when others then null;
  end;

  -- Rule 7 (0041): sent quote, no response after 3 days → one Follow-up task
  -- per estimate, once ever (title carries the number).
  begin
    for r in
      select e.id, e.number, e.client_id, e.org_id, c.name
      from public.estimates e
      join public.clients c on c.id = e.client_id
      where e.status = 'sent'
        and coalesce(e.sent_at::date, e.issued_at) < current_date - 3
    loop
      v_title := 'Follow up on ' || coalesce(r.number, 'quote')
        || ' — ' || coalesce(r.name, 'client');
      if not exists (
        select 1 from public.tasks t
        where t.client_id = r.client_id and t.title = v_title
      ) then
        insert into public.tasks (org_id, client_id, title, due_date)
          values (r.org_id, r.client_id, v_title, current_date);
        total := total + 1;
      end if;
    end loop;
  exception
    when others then null;
  end;

  -- Rule 8 (0043): auto-resume schedules whose seasonal hold has ended.
  begin
    update public.recurring_schedules
    set paused_at = null, resume_on = null
    where paused_at is not null
      and resume_on is not null
      and resume_on <= current_date;
  exception
    when others then null;
  end;

  return total;
end;
$$;

revoke execute on function public.automation_sweep() from anon, authenticated;
