# LawnBizOps

Mobile-first PWA evolving into a **multi-tenant trade-CRM SaaS** (landscaping
first). Original plan: `/Users/andraewilliams/.claude/plans/business-system-for-a-witty-milner.md`.
SaaS roadmap + go-live runbook: `docs/crm-roadmap.md`.

Primary device: **Android Galaxy S26 Ultra (Chrome)** — Google Maps URLs for
deep links, but keep the cross-platform app-managed outbox (no SW Background
Sync dependence).

## Tenancy & auth (branch `feat/v0.1-multitenant`)

Multi-tenant via **org-scoped RLS** is BUILT (migrations 0011–0016) and
validated on a local stack, but **prod is still single-tenant / auth-OFF** until
the Phase E cutover in `docs/crm-roadmap.md` is run.

- Every table has `org_id` defaulting to `current_org()` — the app **never sends
  org_id** (DB stamps it from the session), same as the old user_id default.
- New tables: `org_id uuid not null default public.current_org()` + a single
  `using/with check (org_id = public.current_org())` policy. No anon policies.
- `current_org()` is SECURITY DEFINER (reads memberships); `app_state()` is the
  one gate RPC the `_authed` router uses (onboarded + subscription access).
- Single-login-per-business in v1; `memberships` is the seam for multi-user.
- Local validation: `supabase start` / `db reset`; `supabase/tests/rls_isolation.sql`
  must stay PASS after any RLS change. Regen types from local after migrations.

## Iron rules

- **Every write goes through the outbox** — `enqueue()` in `src/lib/outbox.ts`.
  Never call `supabase.from(...).insert/update/delete` directly from UI code.
  New rows get client-generated `crypto.randomUUID()` ids (idempotent upserts).
- **Never** include `user_id`, `created_at`, `updated_at` in upsert payloads —
  DB defaults and triggers own those.
- **Money is integer cents**; format only at the edge via `src/lib/format.ts`.
- **Dates are date-only strings** from device-local time (`localToday()`),
  never UTC midnight.
- Do NOT replace the outbox with TanStack Query mutation persistence (known
  footguns: TanStack/query#5847, #6825).
- The service worker never caches `*.supabase.co` — data caching belongs to
  TanStack Query + the Dexie persister.

## Backend

Supabase project `Lawn Tools` (`kjovmqtcalrfdguccnfm`, us-east-1). Schema
changes: write `supabase/migrations/NNNN_name.sql` AND apply via the Supabase
MCP `apply_migration`, then regenerate `src/lib/database.types.ts` (MCP
`generate_typescript_types`; keep the `FutureTable` stubs noted in that file
until all SyncTable tables exist). Run MCP `get_advisors` (security) after
DDL. Every table: `user_id default auth.uid()` + RLS policy, `text + check`
statuses, `set_updated_at` trigger.

## Conventions

- Feature folders: `src/features/<entity>/hooks.ts` (+ form components).
  Reads = TanStack Query keys like `['clients']`, `['clients', id]`; writes =
  optimistic `setQueryData` + `enqueue`.
- Routes: TanStack Router file routes in `src/routes/_authed/` (one file =
  Route + components; eslint allows it).
- Theme tokens (Tailwind v4, dark tactical): bg-canvas/panel, border-edge,
  text-sand/faded/khaki, bg-blaze (CTA), text-go/alert. Headers:
  `heading-stencil`. Big glove-friendly tap targets.
- Verify before claiming done:
  `npx prettier --write . && npm run lint && npm test && npm run build`
- QA policy: `docs/qa-playbook.md`. Every bug that reached prod gets THREE
  artifacts in one commit: a regression test that failed before the fix
  (`supabase/tests/cold_cases.sql` for DB bugs), a cold case in
  `.qa/registry.json`, and a structural-lesson entry in `.qa/learnings.md`
  (read that ledger at session start — it's the project's memory of past
  mistakes). Guards live forever — `scripts/qa-registry-check.mjs` (CI) fails
  if one disappears or a lesson is missing. Never weaken a failing test to
  green; floors (coverage/mutation/bundle) only ratchet up.
- Preview server: `.claude/launch.json` → `dev` (port 5173). preview_fill
  doesn't trigger React onChange — use native-setter + input event via
  preview_eval when driving forms.
