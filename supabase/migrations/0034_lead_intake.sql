-- 0034: public "Request a Quote" lead form — top-of-funnel intake. A business
-- shares /quote/<intake_token>; a prospect fills in their details and a new
-- client (stage='lead') + property + activity is created in that org.
--
-- SECURITY MODEL: like the estimate-approval link (0033), access is keyed by an
-- unguessable per-business token, so the endpoint is non-discoverable and no
-- anon RLS policy is added. NOTE: unlike approval (which only flips one existing
-- row), this RPC *inserts*, so it is a public writer — the standard trade-off of
-- any public lead form. Abuse is bounded by: the unguessable token, required
-- fields, and length caps below. A CAPTCHA / rate limit can layer on later.

alter table public.business_settings
  add column if not exists intake_token uuid not null default gen_random_uuid();

-- Business display name for the public form header (trust signal). Null when the
-- token is unknown — the page renders a "form not found" state.
create or replace function public.intake_business_name(p_token uuid)
  returns text
  language sql
  stable
  security definer
  set search_path to ''
as $$
  select business_name from public.business_settings where intake_token = p_token
$$;

-- Create a lead from the public form. Validates server-side (the client also
-- validates) and caps field lengths. Returns jsonb {ok:true} on success.
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
  v_name text := btrim(coalesce(p_name, ''));
  v_phone text := btrim(coalesce(p_phone, ''));
  v_email text := btrim(coalesce(p_email, ''));
  v_address text := btrim(coalesce(p_address, ''));
  v_notes text := btrim(coalesce(p_notes, ''));
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

revoke execute on function public.intake_business_name(uuid) from public;
revoke execute on function public.submit_lead(uuid, text, text, text, text, text) from public;
grant execute on function public.intake_business_name(uuid) to anon, authenticated;
grant execute on function public.submit_lead(uuid, text, text, text, text, text) to anon, authenticated;
