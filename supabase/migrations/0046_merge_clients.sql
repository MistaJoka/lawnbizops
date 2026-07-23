-- 0046: merge duplicate clients — the cleanup half of 0044's prevention.
--
-- 0044 stopped NEW duplicates (intake dedupe + form soft-warn), but twins that
-- already exist could only be soft-archived, stranding their history. This RPC
-- folds one client into another atomically:
--   * properties, estimates, invoices, activities, tasks, expenses move to the
--     kept client (jobs/payments follow their property/invoice automatically)
--   * blank phone/email on the keeper are filled from the duplicate; notes are
--     appended (never overwritten)
--   * the duplicate is archived (soft — same as the Archive button)
--   * a timeline note records the merge on the kept client
--
-- SECURITY: deliberately SECURITY INVOKER — every UPDATE runs under the
-- caller's RLS policies (org_id = current_org()), so cross-org rows are
-- untouchable and no definer-privilege reasoning is needed. Granted to
-- authenticated only; the same-org check is a belt on top of RLS's suspenders.

create or replace function public.merge_clients(p_keep uuid, p_merge uuid)
returns void
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_keep public.clients;
  v_merge public.clients;
begin
  if p_keep = p_merge then
    raise exception 'cannot merge a client into itself';
  end if;

  select * into v_keep from public.clients where id = p_keep;
  if not found then
    raise exception 'client to keep not found';
  end if;
  select * into v_merge from public.clients where id = p_merge;
  if not found then
    raise exception 'client to merge not found';
  end if;
  if v_keep.org_id <> v_merge.org_id then
    raise exception 'clients belong to different organizations';
  end if;

  update public.properties set client_id = p_keep where client_id = p_merge;
  update public.estimates  set client_id = p_keep where client_id = p_merge;
  update public.invoices   set client_id = p_keep where client_id = p_merge;
  update public.activities set client_id = p_keep where client_id = p_merge;
  update public.tasks      set client_id = p_keep where client_id = p_merge;
  update public.expenses   set client_id = p_keep where client_id = p_merge;

  update public.clients set
    phone = case when phone = '' then v_merge.phone else phone end,
    email = case when email = '' then v_merge.email else email end,
    notes = case
      when v_merge.notes = '' then notes
      when notes = '' then v_merge.notes
      else notes || E'\n— merged from ' || v_merge.name || ': ' || v_merge.notes
    end
  where id = p_keep;

  update public.clients set archived_at = now() where id = p_merge;

  insert into public.activities (client_id, kind, body)
  values (
    p_keep,
    'note',
    'Merged duplicate client "' || v_merge.name || '" into this one.'
  );
end;
$$;

revoke execute on function public.merge_clients(uuid, uuid) from public, anon;
grant execute on function public.merge_clients(uuid, uuid) to authenticated;
