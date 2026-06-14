-- 0013: CRM layer — client lifecycle stage, activity timeline, follow-up tasks.
--
-- Assumes the org/auth model (0012) is already in place: new tables default
-- org_id to current_org() and use the same single org-membership policy.

-- ── Client lifecycle stage (the "pipeline") ─────────────────────────────────
-- Default 'active': adding a client usually means an existing customer; mark
-- prospects as 'lead' explicitly. Pipeline view groups by this.
alter table public.clients
  add column stage text not null default 'active'
    check (stage in ('lead', 'quoted', 'active', 'dormant'));

-- ── Activity timeline (append-only) ─────────────────────────────────────────
create table public.activities (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null default public.current_org()
    references public.organizations (id) on delete cascade,
  user_id uuid default auth.uid(),
  client_id uuid references public.clients (id) on delete cascade,
  job_id uuid references public.jobs (id) on delete set null,
  kind text not null default 'note'
    check (kind in ('note', 'call', 'stage_change', 'status_change', 'doc_sent')),
  body text not null default '',
  created_at timestamptz not null default now()
);
create index activities_org_idx on public.activities (org_id);
create index activities_client_idx on public.activities (client_id, created_at desc);

-- ── Follow-up tasks ─────────────────────────────────────────────────────────
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null default public.current_org()
    references public.organizations (id) on delete cascade,
  user_id uuid default auth.uid(),
  client_id uuid references public.clients (id) on delete set null,
  title text not null,
  due_date date,
  done boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index tasks_org_idx on public.tasks (org_id);
create index tasks_due_open_idx on public.tasks (due_date) where not done;

create trigger tasks_updated_at before update on public.tasks
  for each row execute function public.set_updated_at();
-- activities are immutable history → no updated_at trigger.

alter table public.activities enable row level security;
alter table public.tasks enable row level security;

create policy "org members" on public.activities for all
  using (org_id = public.current_org()) with check (org_id = public.current_org());
create policy "org members" on public.tasks for all
  using (org_id = public.current_org()) with check (org_id = public.current_org());
