-- 0022: harden the job-done automation — failure isolation + dedup.
--
-- Lesson from studying mature workflow engines (Twenty): an automation must
-- never break the action that triggers it, and must not stack duplicate
-- effects. Our follow-up trigger runs synchronously inside the job-update
-- transaction, so:
--   * wrap the body so ANY error is swallowed — marking a job done can never
--     fail because of the automation;
--   * only create a follow-up when the client has no open one already.

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
  v_title text;
begin
  -- Failure isolation: the whole rule is best-effort. If anything in here
  -- raises, we catch it below and still let the job update commit.
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
        v_title := 'Follow up with ' || coalesce(v_name, 'client');
        -- Dedup: skip if this client already has an open identical follow-up.
        if not exists (
          select 1 from public.tasks t
          where t.client_id = v_client and t.title = v_title and not t.done
        ) then
          insert into public.tasks (org_id, client_id, title, due_date)
            values (new.org_id, v_client, v_title, current_date + coalesce(v_days, 3));
        end if;
      end if;
    end if;
  end if;
  return new;
exception
  when others then
    -- Never let a follow-up failure roll back the user's "mark job done".
    return new;
end;
$$;

revoke execute on function public.job_done_followup() from anon, authenticated;
