-- 0033: public, token-keyed estimate approval — the first customer-facing
-- surface. A homeowner opens /e/<token> (no login) to view a sent estimate and
-- Approve or Decline it.
--
-- SECURITY MODEL: access is gated entirely by an unguessable per-estimate token
-- through two SECURITY DEFINER RPCs. We deliberately add NO anon RLS policy to
-- the estimates table, so the table itself stays unreadable to anon and cannot
-- be enumerated — the only public reach is "give me the one row whose token you
-- already hold." Both functions pin search_path and are granted to anon.

alter table public.estimates
  add column if not exists approval_token uuid not null default gen_random_uuid();

-- Read a single estimate by its token: a flat JSON bundle (header + business
-- display name + line items) for the public approval page. Only the row whose
-- token matches is ever touched.
create or replace function public.estimate_by_token(p_token uuid)
  returns jsonb
  language sql
  stable
  security definer
  set search_path to ''
as $$
  select jsonb_build_object(
    'id', e.id,
    'number', e.number,
    'status', e.status,
    'issued_at', e.issued_at,
    'valid_until', e.valid_until,
    'notes', e.notes,
    'business_name', coalesce(bs.business_name, ''),
    'client_name', coalesce(c.name, ''),
    'property_label', coalesce(nullif(p.label, ''), p.address_line1, ''),
    'items', coalesce(
      (select jsonb_agg(jsonb_build_object(
                 'description', i.description,
                 'quantity', i.quantity,
                 'unit_price_cents', i.unit_price_cents)
               order by i.sort_order)
         from public.estimate_items i where i.estimate_id = e.id), '[]'::jsonb)
  )
  from public.estimates e
  left join public.business_settings bs on bs.org_id = e.org_id
  left join public.clients c on c.id = e.client_id
  left join public.properties p on p.id = e.property_id
  where e.approval_token = p_token
$$;

-- Approve or decline. Only a 'sent' estimate transitions; anything else returns
-- its current status unchanged (so a double-tap or an already-answered link is a
-- harmless no-op). Logs a status_change activity so the operator sees the reply.
create or replace function public.respond_to_estimate(p_token uuid, p_action text)
  returns text
  language plpgsql
  volatile
  security definer
  set search_path to ''
as $$
declare
  v_estimate public.estimates;
  v_new_status text;
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
  update public.estimates set status = v_new_status where id = v_estimate.id;

  insert into public.activities (org_id, client_id, kind, body)
  values (
    v_estimate.org_id,
    v_estimate.client_id,
    'status_change',
    case when p_action = 'accept'
         then 'Customer approved the estimate online.'
         else 'Customer declined the estimate online.' end
  );

  return v_new_status;
end;
$$;

-- CREATE OR REPLACE resets EXECUTE to PUBLIC; re-apply least privilege and then
-- grant the two roles that reach the public page (anon) and the app (authenticated).
revoke execute on function public.estimate_by_token(uuid) from public;
revoke execute on function public.respond_to_estimate(uuid, text) from public;
grant execute on function public.estimate_by_token(uuid) to anon, authenticated;
grant execute on function public.respond_to_estimate(uuid, text) to anon, authenticated;
