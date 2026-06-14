-- 0020: light automation rules — a trades-sized slice of a workflow engine.
--
-- Two opinionated, per-org toggleable rules (not a general builder):
--   1. Job completed  -> auto-create a follow-up task (DB trigger, immediate).
--   2. Invoice overdue -> auto-create a "send reminder" task (nightly sweep).
-- Tasks land in the same Follow-ups surface the user already sees on Today.

alter table public.business_settings
  add column auto_followup_after_job boolean not null default false,
  add column auto_followup_days integer not null default 3,
  add column auto_overdue_reminder boolean not null default false,
  add column auto_overdue_days integer not null default 7;

-- ── Rule 1: job marked done → follow-up task ────────────────────────────────
create or replace function public.job_done_followup()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_enabled boolean;
  v_days integer;
  v_client uuid;
  v_name text;
begin
  if new.status = 'done' and old.status is distinct from 'done' then
    select auto_followup_after_job, auto_followup_days
      into v_enabled, v_days
      from public.business_settings where org_id = new.org_id;
    if v_enabled then
      select p.client_id, c.name into v_client, v_name
        from public.properties p
        join public.clients c on c.id = p.client_id
        where p.id = new.property_id;
      if v_client is not null then
        insert into public.tasks (org_id, client_id, title, due_date)
          values (
            new.org_id, v_client,
            'Follow up with ' || coalesce(v_name, 'client'),
            current_date + coalesce(v_days, 3)
          );
      end if;
    end if;
  end if;
  return new;
end;
$$;

create trigger jobs_done_followup
  after update on public.jobs
  for each row execute function public.job_done_followup();

-- ── Rule 2: nightly sweep for overdue invoices ──────────────────────────────
-- Creates one "Send reminder" task per overdue unpaid invoice, once ever
-- (deduped by title), for orgs that opted in.
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
  return total;
end;
$$;

revoke execute on function public.automation_sweep() from anon, authenticated;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'automation-sweep') then
    perform cron.unschedule('automation-sweep');
  end if;
  perform cron.schedule('automation-sweep', '15 7 * * *', 'select public.automation_sweep();');
end;
$$;
