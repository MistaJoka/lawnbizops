-- 0005: recurring schedules, jobs, and the materialization engine

create table public.recurring_schedules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid),
  property_id uuid not null references public.properties (id) on delete cascade,
  service_id uuid references public.services (id) on delete set null,
  cadence text not null check (cadence in ('weekly', 'biweekly', 'every_4_weeks', 'monthly_day')),
  -- anchor_date is the first occurrence; week-based cadences derive their
  -- weekday and parity from it. monthly_day uses day_of_month.
  anchor_date date not null,
  day_of_month integer check (day_of_month between 1 and 31),
  price_cents integer not null default 0,
  notes text not null default '',
  paused_at timestamptz,
  ends_on date,
  last_materialized_through date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint monthly_needs_day check (cadence <> 'monthly_day' or day_of_month is not null)
);

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid),
  property_id uuid not null references public.properties (id) on delete cascade,
  schedule_id uuid references public.recurring_schedules (id) on delete set null,
  service_id uuid references public.services (id) on delete set null,
  occurrence_date date,            -- original slot from the schedule (null for one-offs)
  scheduled_date date not null,    -- the actual day (rain reschedule moves this)
  status text not null default 'scheduled'
    check (status in ('scheduled', 'in_progress', 'done', 'skipped', 'canceled', 'invoiced')),
  price_cents integer not null default 0,
  title text not null default '',
  notes text not null default '',
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (schedule_id, occurrence_date)
);

create index recurring_schedules_property_idx on public.recurring_schedules (property_id);
create index recurring_schedules_user_idx on public.recurring_schedules (user_id);
create index jobs_scheduled_date_idx on public.jobs (scheduled_date);
create index jobs_schedule_idx on public.jobs (schedule_id);
create index jobs_property_idx on public.jobs (property_id);
create index jobs_user_idx on public.jobs (user_id);

create trigger recurring_schedules_updated_at
  before update on public.recurring_schedules
  for each row execute function public.set_updated_at();
create trigger jobs_updated_at
  before update on public.jobs
  for each row execute function public.set_updated_at();

alter table public.recurring_schedules enable row level security;
alter table public.jobs enable row level security;

create policy "own recurring_schedules" on public.recurring_schedules
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own jobs" on public.jobs
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "anon access (temp no-auth)" on public.recurring_schedules
  for all to anon using (true) with check (true);
create policy "anon access (temp no-auth)" on public.jobs
  for all to anon using (true) with check (true);

-- Materialize concrete job rows from schedules, idempotently, up to a date.
-- Called by the app on startup (cheap no-op when current).
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
          (user_id, property_id, schedule_id, service_id, occurrence_date, scheduled_date, price_cents)
        values
          (s.user_id, s.property_id, s.id, s.service_id, d, d, s.price_cents)
        on conflict (schedule_id, occurrence_date) do nothing;
        get diagnostics rows_inserted = row_count;
        total := total + rows_inserted;
        d := d + step;
      end loop;
    else
      -- monthly_day: same day each month, clamped to the month's last day
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
            (user_id, property_id, schedule_id, service_id, occurrence_date, scheduled_date, price_cents)
          values
            (s.user_id, s.property_id, s.id, s.service_id, d, d, s.price_cents)
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

-- After editing a schedule: drop its untouched future jobs and regenerate.
-- Started/done/skipped jobs are never touched.
create or replace function public.resync_schedule(p_schedule_id uuid, through_date date)
returns integer
language plpgsql
set search_path = ''
as $$
begin
  delete from public.jobs
    where schedule_id = p_schedule_id
      and status = 'scheduled'
      and scheduled_date >= current_date;
  update public.recurring_schedules
    set last_materialized_through = null
    where id = p_schedule_id;
  return public.materialize_jobs(through_date);
end;
$$;
