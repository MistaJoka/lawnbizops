-- 0036: email outbox — server-owned transactional email delivery.
--
-- Why a server-side outbox instead of sending from the client: reminders must
-- go out even when the operator never opens the app, provider failures need
-- retry state that survives the device, and the client outbox already has the
-- perfect primitive for "this write must eventually happen" — an rpc op
-- calling queue_email(). One pipeline serves manual sends and automations.
--
-- Flow: app enqueues queue_email() through its offline outbox → row lands
-- 'queued' → the send-email edge function (kicked by pg_cron every minute via
-- kick_email_drain(), or by the app right after a flush) claims a batch,
-- renders from live rows, POSTs to Resend, stamps sent_at on the row and the
-- document. Dormant until the Vault + function secrets are set (same seam
-- pattern as the Stripe functions).

create table public.email_outbox (
  id uuid primary key,
  org_id uuid not null references public.organizations (id) on delete cascade,
  template text not null
    check (template in ('estimate_send', 'invoice_send', 'invoice_overdue', 'job_reminder')),
  entity_id uuid not null,
  to_email text not null,
  status text not null default 'queued'
    check (status in ('queued', 'sending', 'sent', 'failed')),
  attempts integer not null default 0,
  error text not null default '',
  provider_id text not null default '',
  send_date date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sent_at timestamptz
);

create index email_outbox_status_idx on public.email_outbox (status);
create index email_outbox_org_idx on public.email_outbox (org_id);
-- Automations get a hard exactly-once guard per entity per day; manual resends
-- (estimate_send / invoice_send) stay allowed — their idempotency is the id.
create unique index email_outbox_automation_dedup
  on public.email_outbox (template, entity_id, send_date)
  where template in ('invoice_overdue', 'job_reminder');

create trigger email_outbox_updated_at
  before update on public.email_outbox
  for each row execute function public.set_updated_at();

alter table public.email_outbox enable row level security;
-- Members can read their org's email history; every write goes through
-- queue_email (definer) or the service-role drain — no write policies.
create policy "org members read" on public.email_outbox
  for select using (org_id = public.current_org());

-- Delivery stamps on the documents themselves.
alter table public.estimates add column if not exists sent_at timestamptz;
alter table public.invoices  add column if not exists sent_at timestamptz;

-- Queue a manual document email. Validates the entity belongs to the caller's
-- org and the client has an email; idempotent on the client uuid so outbox
-- retries never double-queue.
create or replace function public.queue_email(p_id uuid, p_template text, p_entity_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_email text;
begin
  if p_template = 'estimate_send' then
    select e.org_id, c.email into v_org, v_email
      from public.estimates e join public.clients c on c.id = e.client_id
      where e.id = p_entity_id;
  elsif p_template = 'invoice_send' then
    select i.org_id, c.email into v_org, v_email
      from public.invoices i join public.clients c on c.id = i.client_id
      where i.id = p_entity_id;
  else
    raise exception 'invalid template';
  end if;

  if v_org is null or v_org is distinct from public.current_org() then
    raise exception 'not found';
  end if;
  if coalesce(v_email, '') = '' then
    raise exception 'client has no email';
  end if;

  insert into public.email_outbox (id, org_id, template, entity_id, to_email)
  values (p_id, v_org, p_template, p_entity_id, v_email)
  on conflict (id) do nothing;
end;
$$;

revoke execute on function public.queue_email(uuid, text, uuid) from public, anon;
grant execute on function public.queue_email(uuid, text, uuid) to authenticated;

-- Atomically claim a batch for the drain worker (service role only). Bumps
-- attempts on claim; also reclaims rows stuck 'sending' >10 min (crashed run).
create or replace function public.claim_queued_emails(p_limit integer default 20)
returns setof public.email_outbox
language sql
security definer
set search_path = ''
as $$
  update public.email_outbox
     set status = 'sending', attempts = attempts + 1
   where id in (
     select id from public.email_outbox
      where status = 'queued'
         or (status = 'sending' and updated_at < now() - interval '10 minutes')
      order by created_at
      limit p_limit
      for update skip locked
   )
  returning *;
$$;

revoke execute on function public.claim_queued_emails(integer) from public, anon, authenticated;
grant execute on function public.claim_queued_emails(integer) to service_role;

-- Cron kick: every minute, if anything is queued and both Vault secrets exist
-- (send_email_url, send_email_drain_key), POST to the edge function. A no-op
-- costs one indexed exists() — cheap enough to run always.
create extension if not exists pg_net;

create or replace function public.kick_email_drain()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text;
  v_key text;
begin
  if not exists (select 1 from public.email_outbox where status = 'queued') then
    return;
  end if;
  select decrypted_secret into v_url
    from vault.decrypted_secrets where name = 'send_email_url';
  select decrypted_secret into v_key
    from vault.decrypted_secrets where name = 'send_email_drain_key';
  if v_url is null or v_key is null then
    return;
  end if;
  perform net.http_post(
    url := v_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-drain-key', v_key),
    body := '{}'::jsonb
  );
end;
$$;

revoke execute on function public.kick_email_drain() from public, anon, authenticated;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'send-email-drain') then
    perform cron.unschedule('send-email-drain');
  end if;
  perform cron.schedule('send-email-drain', '* * * * *', 'select public.kick_email_drain();');
end;
$$;
