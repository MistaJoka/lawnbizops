-- 0044: close two funnel-integrity holes — lost quotes get a WHY, and the
-- public quote form stops manufacturing duplicate clients.
--
-- B3 — decline reasons: no loss reason was captured anywhere (operator decline
-- and customer decline were both bare status flips), making win/loss analysis
-- impossible. Adds estimates.decline_reason, an optional p_reason on the
-- public respond_to_estimate (the old 2-arg signature is dropped — the new
-- 3-arg has a default, so existing callers keep working), and the reason is
-- appended to the activity so the operator sees it in the timeline/inbox.
--
-- B5 — intake dedupe: submit_lead created a brand-new client + property on
-- EVERY submission, so a repeat prospect guaranteed duplicates. It now matches
-- an existing (unarchived) client in the org by normalized phone digits or
-- case-insensitive email; a match logs a "Repeat inquiry" activity — carrying
-- the address/notes from the form — on the existing client instead of
-- inserting a twin. ("Repeat inquiry" is also a notable event for the Today
-- attention card — a returning prospect is hot.)

alter table public.estimates
  add column decline_reason text not null default '';

-- Signature change: drop the 2-arg version so PostgREST sees one function.
drop function if exists public.respond_to_estimate(uuid, text);

create or replace function public.respond_to_estimate(
  p_token uuid,
  p_action text,
  p_reason text default ''
)
  returns text
  language plpgsql
  volatile
  security definer
  set search_path to ''
as $$
declare
  v_estimate public.estimates;
  v_new_status text;
  v_reason text := left(btrim(coalesce(p_reason, '')), 500);
begin
  if p_action not in ('accept', 'decline') then
    raise exception 'invalid action';
  end if;

  select * into v_estimate from public.estimates where approval_token = p_token;
  if not found then
    raise exception 'not found';
  end if;

  if v_estimate.status <> 'sent' then
    return v_estimate.status;
  end if;

  v_new_status := case when p_action = 'accept' then 'accepted' else 'declined' end;
  update public.estimates
    set status = v_new_status,
        decline_reason = case when p_action = 'decline' then v_reason else '' end
    where id = v_estimate.id;

  insert into public.activities (org_id, client_id, kind, body)
  values (
    v_estimate.org_id,
    v_estimate.client_id,
    'status_change',
    case when p_action = 'accept'
         then 'Customer approved the estimate online.'
         else 'Customer declined the estimate online.'
           || case when v_reason <> '' then ' Reason: ' || v_reason else '' end
    end
  );

  return v_new_status;
end;
$$;

revoke execute on function public.respond_to_estimate(uuid, text, text) from public;
grant execute on function public.respond_to_estimate(uuid, text, text)
  to anon, authenticated;

-- submit_lead: same signature, dedupe-aware body.
create or replace function public.submit_lead(
  p_token uuid,
  p_name text,
  p_phone text,
  p_email text,
  p_address text,
  p_notes text
)
  returns jsonb
  language plpgsql
  volatile
  security definer
  set search_path to ''
as $$
declare
  v_org uuid;
  v_client uuid;
  v_existing uuid;
  v_name text := btrim(coalesce(p_name, ''));
  v_phone text := btrim(coalesce(p_phone, ''));
  v_email text := btrim(coalesce(p_email, ''));
  v_address text := btrim(coalesce(p_address, ''));
  v_notes text := btrim(coalesce(p_notes, ''));
  v_phone_digits text := regexp_replace(v_phone, '\D', '', 'g');
begin
  select org_id into v_org
    from public.business_settings where intake_token = p_token;
  if v_org is null then
    raise exception 'unknown form';
  end if;

  if v_name = '' then
    raise exception 'name is required';
  end if;
  if v_phone = '' and v_email = '' then
    raise exception 'a phone or email is required';
  end if;
  if length(v_name) > 200 or length(v_phone) > 50 or length(v_email) > 200
     or length(v_address) > 300 or length(v_notes) > 2000 then
    raise exception 'input too long';
  end if;

  -- Dedupe: same normalized phone digits or same email = same person.
  select c.id into v_existing
    from public.clients c
    where c.org_id = v_org
      and c.archived_at is null
      and (
        (v_phone_digits <> ''
          and regexp_replace(c.phone, '\D', '', 'g') = v_phone_digits)
        or (v_email <> '' and lower(c.email) = lower(v_email))
      )
    order by c.created_at
    limit 1;

  if v_existing is not null then
    insert into public.activities (org_id, client_id, kind, body)
    values (
      v_org,
      v_existing,
      'note',
      'Repeat inquiry from the quote form.'
        || case when v_address <> '' then ' Address: ' || v_address || '.' else '' end
        || case when v_notes <> '' then ' — ' || v_notes else '' end
    );
    return jsonb_build_object('ok', true);
  end if;

  insert into public.clients (org_id, name, phone, email, stage, notes)
  values (v_org, v_name, v_phone, v_email, 'lead', v_notes)
  returning id into v_client;

  if v_address <> '' then
    insert into public.properties (org_id, client_id, address_line1)
    values (v_org, v_client, v_address);
  end if;

  insert into public.activities (org_id, client_id, kind, body)
  values (v_org, v_client, 'note', 'New lead from the online quote-request form.');

  return jsonb_build_object('ok', true);
end;
$$;

revoke execute on function public.submit_lead(uuid, text, text, text, text, text) from public;
grant execute on function public.submit_lead(uuid, text, text, text, text, text)
  to anon, authenticated;
