-- 0012: auth ON — the breaking cutover to org-scoped RLS.
--
-- Makes org_id mandatory (defaulting to the caller's org), drops every
-- temporary anon policy, and replaces per-table policies with a single
-- org-membership rule. Also re-keys business_settings to org_id and scopes
-- Storage objects by an org_id path prefix.
--
-- ⚠ This is the switch that REQUIRES login. Do NOT apply to production until
-- the live data has been adopted into an org (see docs/crm-roadmap.md cutover).

-- ── Domain tables: org_id NOT NULL + default, single org policy ──────────────
do $$
declare
  t text;
  p record;
  tables text[] := array[
    'clients', 'properties', 'services', 'property_services',
    'recurring_schedules', 'jobs', 'estimates', 'estimate_items',
    'invoices', 'invoice_items', 'payments', 'photos', 'inventory_items',
    'business_settings'
  ];
begin
  foreach t in array tables loop
    -- New rows inherit the caller's org from their session — the app never
    -- has to send org_id (mirrors the old user_id default).
    execute format('alter table public.%I alter column org_id set default public.current_org()', t);
    execute format('alter table public.%I alter column org_id set not null', t);

    -- Drop whatever policies exist (names vary across history) and install one.
    for p in
      select policyname from pg_policies where schemaname = 'public' and tablename = t
    loop
      execute format('drop policy %I on public.%I', p.policyname, t);
    end loop;

    execute format(
      'create policy "org members" on public.%I for all using (org_id = public.current_org()) with check (org_id = public.current_org())',
      t
    );
  end loop;
end $$;

-- ── Re-key business_settings to the org (retire the user_id PK/default) ──────
alter table public.business_settings drop constraint business_settings_pkey;
alter table public.business_settings alter column user_id drop default;
alter table public.business_settings alter column user_id drop not null;

-- ── Recurrence engine must carry the schedule's org into new jobs ───────────
create or replace function public.materialize_jobs(through_date date)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  s record;
  from_date date;
  bound date;
  step integer;
  diff integer;
  d date;
  m date;
  days_in_month integer;
  rows_inserted integer;
  total integer := 0;
begin
  for s in
    select * from public.recurring_schedules
    where paused_at is null
      and (last_materialized_through is null or last_materialized_through < through_date)
  loop
    from_date := greatest(s.anchor_date, coalesce(s.last_materialized_through + 1, s.anchor_date));
    bound := least(through_date, coalesce(s.ends_on, through_date));

    if s.cadence in ('weekly', 'biweekly', 'every_4_weeks') then
      step := case s.cadence when 'weekly' then 7 when 'biweekly' then 14 else 28 end;
      diff := from_date - s.anchor_date;
      if diff <= 0 then
        d := s.anchor_date;
      else
        d := s.anchor_date + (((diff + step - 1) / step) * step);
      end if;
      while d <= bound loop
        insert into public.jobs
          (org_id, user_id, property_id, schedule_id, service_id, occurrence_date, scheduled_date, price_cents)
        values
          (s.org_id, s.user_id, s.property_id, s.id, s.service_id, d, d, s.price_cents)
        on conflict (schedule_id, occurrence_date) do nothing;
        get diagnostics rows_inserted = row_count;
        total := total + rows_inserted;
        d := d + step;
      end loop;
    else
      m := date_trunc('month', from_date)::date;
      loop
        days_in_month := extract(day from (m + interval '1 month' - interval '1 day'))::integer;
        d := make_date(
          extract(year from m)::integer,
          extract(month from m)::integer,
          least(s.day_of_month, days_in_month)
        );
        exit when d > bound;
        if d >= from_date and d >= s.anchor_date then
          insert into public.jobs
            (org_id, user_id, property_id, schedule_id, service_id, occurrence_date, scheduled_date, price_cents)
          values
            (s.org_id, s.user_id, s.property_id, s.id, s.service_id, d, d, s.price_cents)
          on conflict (schedule_id, occurrence_date) do nothing;
          get diagnostics rows_inserted = row_count;
          total := total + rows_inserted;
        end if;
        m := (m + interval '1 month')::date;
      end loop;
    end if;

    update public.recurring_schedules
      set last_materialized_through = through_date
      where id = s.id;
  end loop;
  return total;
end;
$$;

-- ── Storage: scope objects by an org_id path prefix ─────────────────────────
-- App uploads to `<org_id>/...`; a member can only touch their org's folder.
drop policy if exists "anon photos all (temp no-auth)" on storage.objects;
drop policy if exists "auth photos all" on storage.objects;
drop policy if exists "anon logos all (temp no-auth)" on storage.objects;
drop policy if exists "auth logos all" on storage.objects;

create policy "org photos" on storage.objects for all to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = public.current_org()::text)
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = public.current_org()::text);
create policy "org logos" on storage.objects for all to authenticated
  using (bucket_id = 'logos' and (storage.foldername(name))[1] = public.current_org()::text)
  with check (bucket_id = 'logos' and (storage.foldername(name))[1] = public.current_org()::text);
