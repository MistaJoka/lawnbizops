# Trade-CRM Roadmap — from LawnBizOps to a sellable vertical CRM

**Status:** planning · **Author:** solo dev · **Date:** 2026-06-14
**Target stack:** Vite + React 19 + TypeScript (SPA/PWA) · Supabase (Postgres 17 + Auth + Storage + Edge Functions) · Dexie offline outbox

---

## 0. Legal guardrails (clean-room statement)

This product is **proprietary and sellable**. Twenty (twentyhq/twenty) is **AGPL-3.0** and is used here as _architectural inspiration only_.

- ❌ No Twenty source is copied, fetched, cloned, ported, or translated line-by-line.
- ✅ Only **generic CRM patterns** common to any system are referenced (RLS-scoped Postgres, a typed data-access layer, an async job queue, feature-module frontend). These are industry-standard and not original to Twenty.
- ✅ All schema and code in this build are **original**, designed for the trades use case.

**The most important clean-room insight:** Twenty's core is a _generic custom-object engine_ (dynamic schema, metadata-driven GraphQL). Copying that would be both a license risk and a product mistake. Your advantage is the **opposite**: a fixed, opinionated schema for one trade. We lean into that divergence deliberately throughout this doc.

---

## STEP 1 — Audit of the existing repo

### 1.1 Current architecture

| Layer        | Choice                                               | Notes                                                                        |
| ------------ | ---------------------------------------------------- | ---------------------------------------------------------------------------- |
| App shell    | Vite 8 + React 19 + TS (strict) SPA                  | Installable PWA (`vite-plugin-pwa`), precached app shell                     |
| Routing      | TanStack Router (file routes, `src/routes/_authed/`) | `_authed` layout exists as the auth seam — currently passes everyone through |
| Server state | TanStack Query v5 + `persistQueryClient`             | Cache persisted to IndexedDB → cold-start works offline                      |
| Local store  | Dexie (IndexedDB)                                    | Holds the **outbox** + the query-cache persister                             |
| Backend      | Supabase (Postgres 17, RLS, Storage)                 | `@supabase/supabase-js` v2, publishable key                                  |
| Writes       | Custom **outbox** (`src/lib/outbox.ts`)              | FIFO queue, idempotent upserts, poison-op quarantine, retry/backoff          |
| PDFs         | `@react-pdf/renderer` (client-side)                  | Invoices + estimates → native share sheet                                    |
| Deploy       | GitHub Pages + Actions (CI + Deploy)                 | Static SPA; Supabase is the only backend                                     |

### 1.2 Data model (10 migrations applied)

```
business_settings ── per-install profile, numbering counters, payment-provider seam
clients ───────────┐
  properties ──────┤ (lat/lng geocoded, gate codes, notes)
    property_services (per-property price overrides)
    recurring_schedules ── cadence + anchor, materialized by RPC
      jobs ─────── status pipeline: scheduled→in_progress→done→skipped→canceled→invoiced
estimates (+ estimate_items) ── draft→sent→accepted→declined→expired
invoices (+ invoice_items) ──── draft→sent→partially_paid→paid→void  (+ INV-n trigger)
  payments ──────── apply_payment() RPC flips status atomically
photos ──────────── job/estimate attachments (Storage)
inventory_items ── stock + reorder levels
```

Server-side logic worth noting: `materialize_jobs()` / `resync_schedule()` (recurrence), `apply_payment()` (atomic), `invoice_balances` view, numbering triggers, `set_updated_at`, plus client libs for geocoding (OSM Nominatim), routing (haversine + nearest-neighbor), and the recurrence mirror.

### 1.3 ✅ What works and is worth keeping

- [x] **The offline outbox** (`src/lib/outbox.ts`) — original, tested (FIFO, poison-skip, idempotent retry). This is a **genuine differentiator**: field trades work in dead zones; most web CRMs (Twenty included) assume connectivity. _Keep and market this._
- [x] **Recurrence engine** — the landscaping core (weekly/biweekly/4-week/monthly), idempotent server-side materialization. Hard to build, already done.
- [x] **Invoicing + estimates + payments** with client-side PDFs and share-sheet delivery.
- [x] **Drive-order routing** (nearest-neighbor + multi-stop Maps deep link) — a real field-ops nicety.
- [x] **Jobs kanban board** (`board.tsx`) — already a pipeline view for work.
- [x] **Engineering discipline**: feature-folder structure, generated DB types, migration files paired with applied migrations, `get_advisors` security checks, CI gating lint/test/build, money-as-cents + date-only conventions.
- [x] **PWA install + one-hand mobile UX** — the distribution and ergonomics are done.

### 1.4 ⚠️ What's missing / half-built for a _trade CRM SaaS_

| Gap                              | Severity   | Today                                                                                                                                                             |
| -------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Auth is OFF**                  | 🔴 blocker | Migration 0004 + every table carries an `anon access (temp no-auth)` policy and a placeholder `user_id` default `00000000-…`. No signup, no login, no real users. |
| **No tenancy**                   | 🔴 blocker | No `organizations`; data is single-install. Selling to N businesses requires per-org isolation.                                                                   |
| **No lead/contact intake**       | 🟡         | Only `clients` exist — no way to hold a _prospect_ who isn't yet a paying client, which is the "C" in CRM.                                                        |
| **No activity timeline**         | 🟡         | Notes are freeform text fields; no chronological log of calls/texts/visits/status changes per client.                                                             |
| **No follow-up tasks/reminders** | 🟡         | "Friendly reminder" exists for invoices only; no general "call back Tuesday" task model.                                                                          |
| **Billing seam only**            | 🟡         | `payment_provider` columns exist but Square/PayPal is a stub; no subscription/plan model for _your_ SaaS revenue.                                                 |
| **Client-side scheduling**       | 🟡         | `materialize_jobs` runs on app open. Fine for one user; a multi-tenant app should run sweeps server-side.                                                         |
| **Static-only hosting**          | 🟡         | GitHub Pages can't host Stripe webhooks or signup emails — those need Supabase Edge Functions (the SPA can stay static).                                          |

---

## STEP 2 — Minimal v1 feature set (landscaping-first)

**Principle:** ship the _smallest_ thing a solo landscaping business will pay for, then widen. HVAC is a deferred module, not a v1 concern.

### v1 = "the job-to-cash loop, multi-tenant"

- [ ] **Auth + one org per business** — signup, login, password reset; every row scoped to an org via RLS.
- [ ] **Contacts/Clients** — existing, plus a lightweight **lead** flag (prospect vs. active client) and a simple **stage** (`lead → quoted → active → dormant`).
- [ ] **Properties** — existing (the landscaping killer feature; keep as-is).
- [ ] **Jobs / work orders** — existing (one-off + recurring), kanban + Today route view.
- [ ] **Scheduling** — existing recurrence + drive-order, moved to a server sweep.
- [ ] **Quotes → Invoices → Payments** — existing; keep manual payment recording.
- [ ] **Pipeline/status** — existing job + estimate + invoice statuses surfaced on one board.
- [ ] **Activity timeline** (new, small) — append-only log per client: status changes, sent docs, manual notes ("called, left VM").
- [ ] **Follow-up tasks** (new, small) — a `tasks` table: "follow up with X on DATE", surfaced on Today.
- [ ] **Per-org settings + onboarding** — business profile, logo, service catalog seeding, sample data.

### ✂️ Explicitly CUT from v1 (and why)

| Cut                                                      | Why                                                                                          |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Multi-user / crew logins                                 | You chose single login per business. Build the **membership seam**, not the feature.         |
| HVAC equipment/asset tracking, service agreements        | Deferred vertical module; doubles scope.                                                     |
| Custom-object / metadata engine (the Twenty hallmark)    | License risk + over-engineering. A fixed schema is the product.                              |
| Stripe self-serve billing                                | Hand-sell + manually onboard design partners first (your call). Seam now, integration later. |
| Customer portal (online quote acceptance, client login)  | Share-sheet PDFs are enough for v1.                                                          |
| Plugin system, workflow automation builder, reporting/BI | Enterprise. Not what a solo trade buys.                                                      |
| Email/SMS sending infra (Twilio/Resend)                  | Keep "share through your own phone" — zero deliverability surface, feels personal, free.     |

---

## STEP 3 — Inspiration → original build (plain English, no Twenty code)

For each area: the **generic pattern** worth adopting, **why**, and **how you build it originally** on your stack.

### 3.1 Data model — tenant-scoped relational schema with RLS

**Generic pattern.** Every CRM that hosts multiple customers on one database adds a tenant key to every table and enforces isolation in the database itself (row-level security), not in app code. The point is _defense in depth_: a forgotten `WHERE org_id = …` in app code can't leak data, because the database refuses to return other tenants' rows.

**Why.** You're a solo dev; you will eventually forget a filter. RLS makes that mistake non-fatal. It's also the cheapest model to operate (one project, one migration set).

**Your original implementation.**

- New `organizations` table; new `org_id uuid not null` FK on every existing table.
- A `memberships(user_id, org_id, role)` table — **even though v1 is single-login**, model it as one membership row per signup. Going multi-user later = inserting rows, not reshaping tables. This is the seam.
- One SQL helper, `current_org()`, returns the caller's org from their membership (or a JWT claim). Every RLS policy becomes `using (org_id = current_org())` — deny-by-default, no anon policies.
- Replace the `00000000-…` placeholder defaults and drop every `anon access (temp no-auth)` policy in the same migration that turns auth on.
- Keep your existing conventions (cents, date-only, `set_updated_at`, status `text + check`) — they're already correct.

> **Divergence from Twenty, on purpose:** no dynamic/custom objects. Your tables are hand-designed for trades. This is simpler, faster, and license-clean.

### 3.2 API layer — a typed data-access layer over Postgres

**Generic pattern.** CRMs put a typed layer between the UI and the database so the frontend never hand-writes SQL and types stay in sync with the schema. Twenty does this with a metadata-driven GraphQL server. The _generic_ idea — "typed, schema-synced data access" — is what matters, not the GraphQL machinery.

**Why.** You already have the lightweight version of this and it's _better_ for your scale than a bespoke GraphQL server: PostgREST (via `supabase-js`) + generated `database.types.ts` + your feature hooks. Adding a custom API server would be cost with no benefit for a fixed schema.

**Your original implementation.**

- Keep PostgREST + generated types as the read path; keep the **outbox** as the write path. Don't introduce GraphQL.
- For multi-row transactional logic (you already do this well), keep using **Postgres RPCs** (`apply_payment`, `materialize_jobs`) — they're your "mutations." Add RPCs as needed (e.g. `convert_estimate_to_invoice`) rather than orchestrating multi-write sequences in the client.
- Stamp `org_id` **at enqueue time** in the outbox, never at flush — so a write created offline is bound to the right tenant even if the session is refreshed before it syncs.

### 3.3 Background jobs — an async queue for work that shouldn't block

**Generic pattern.** CRMs run a worker for things that mustn't happen inside a user's request: sending reminders, generating documents, materializing recurring records, nightly sweeps. The generic shape is "enqueue work → a separate process drains it on a schedule or trigger."

**Why.** Today `materialize_jobs` runs _client-side on app open_ — fine for one user, wrong for a SaaS (depends on someone opening the app; can't send a reminder when the app is closed).

**Your original implementation (no heavyweight worker needed).**

- **Scheduled sweeps** via Supabase **`pg_cron`** + a small **Edge Function** (or pure SQL): nightly `materialize_jobs` for every active org; a daily pass that surfaces due follow-up tasks and overdue invoices.
- **Event-driven** bits via Edge Functions: the future Stripe webhook, the future "email me a copy" action.
- The **outbox stays** as the _client→server_ queue (offline writes). The server sweep is the _server-side_ queue. Two clearly separated mechanisms, each doing one job.

### 3.4 Frontend structure — feature modules + record list/detail views

**Generic pattern.** CRMs organize the UI by entity (a module per object) with a recurring "list view → record detail → edit" shape, over a thin shared design system.

**Why.** You already have this (`src/features/<entity>/`, route folders, shared `Field`/`Fab`/`Toggle`, the Field-Hardened theme). It scales fine; don't rebuild it.

**Your original implementation.**

- Add two new feature modules following the existing convention: `src/features/leads/` (or fold into `clients/` with a stage field) and `src/features/tasks/`.
- Add an `ActivityTimeline` shared component rendered on client/job detail, reading an append-only `activities` table.
- Keep the offline-first read/write conventions (TanStack Query keys + `enqueue`) for every new entity — consistency is the win.

---

## STEP 4 — Phased execution plan (v0.1 → v1.0)

Effort is rough, sized for **one developer**, in focused days. Each phase is independently shippable.

### Phase v0.1 — Multi-tenant foundation 🔴 _(the spine)_

**Scope:** turn auth on, add org isolation, migrate existing live data safely.

- [ ] `organizations` + `memberships` tables; `org_id` on every table; `current_org()` helper.
- [ ] Rewrite **all** RLS policies to `org_id = current_org()`; drop every `anon` policy; remove placeholder `user_id` defaults.
- [ ] Supabase Auth: email+password signup/login/reset; on signup, create org + membership in one transaction (Edge Function or DB trigger).
- [ ] Restore the `_authed` route guard (`beforeLoad` session check → redirect to `/login`).
- [ ] Outbox: stamp `org_id` at enqueue; handle 401 on flush (refresh session, then retry).
- [ ] **Data migration:** assign all existing placeholder-owned rows to a seed org bound to your own login (don't orphan the live landscaper data).

| Files / modules                                                                                                                                                                                      | Effort       |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| `supabase/migrations/0011_org_tenancy.sql`, `0012_auth_on.sql` · `src/routes/login.tsx` (re-add) · `src/routes/_authed.tsx` · `src/lib/outbox.ts` · `src/lib/supabase.ts` · new `src/features/auth/` | **5–8 days** |

### Phase v0.2 — CRM layer (leads, timeline, tasks) 🟡

**Scope:** the "CRM" features the ops app lacks.

- [ ] Client `stage` (`lead → quoted → active → dormant`) + a leads/pipeline view (reuse the board pattern).
- [ ] `activities` append-only table + `ActivityTimeline` component on client & job detail; auto-log status changes and sent docs.
- [ ] `tasks` table (follow-ups with due dates) surfaced on Today; "remind me to call" quick-add.

| Files / modules                                                                                                                                                                   | Effort       |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| `0013_crm_layer.sql` · `src/features/leads/` · `src/features/tasks/` · `src/components/ActivityTimeline.tsx` · `src/routes/_authed/pipeline.tsx` · edits to Today + client detail | **4–6 days** |

### Phase v0.3 — Server-side scheduling 🟡

**Scope:** move time-based work off the client.

- [ ] `pg_cron` nightly `materialize_jobs` for all active orgs.
- [ ] Daily sweep: due tasks + overdue-invoice flags (data for in-app badges; no email yet).
- [ ] Remove/relegate the client-side materialize-on-open to a fallback.

| Files / modules                                                                                  | Effort       |
| ------------------------------------------------------------------------------------------------ | ------------ |
| `0014_cron_sweeps.sql` · `supabase/functions/daily-sweep/` · edit `src/routes/_authed/index.tsx` | **2–3 days** |

### Phase v0.4 — Onboarding & per-org polish 🟢

**Scope:** make a brand-new signup productive in 5 minutes.

- [ ] First-run wizard: business profile, logo, seed service catalog, optional sample data.
- [ ] Per-org empty states and copy (no demo data bleed).
- [ ] Product naming/brand decision (LawnBizOps → vertical-neutral or sub-branded).

| Files / modules                                                                         | Effort       |
| --------------------------------------------------------------------------------------- | ------------ |
| `src/routes/_authed/onboarding.tsx` · `src/features/settings/*` · manifest/brand assets | **3–4 days** |

### Phase v0.5 → v1.0 — Billing & payment processing 🟡

**Scope:** collect _your_ SaaS revenue; let customers take card payments.

- [ ] `plans` + `subscriptions` tables; `subscription_status` gate in the `_authed` guard (read-only / locked when lapsed).
- [ ] **Stripe Billing**: Checkout for signup→plan, customer portal, webhook (Edge Function) → update `subscriptions`.
- [ ] Activate the existing Square/PayPal seam so _their_ invoices can be paid by card (was a stub).

| Files / modules                                                                                                                         | Effort       |
| --------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| `0015_billing.sql` · `supabase/functions/stripe-webhook/` · `src/features/billing/` · `src/routes/_authed/settings/payments.tsx` (real) | **6–9 days** |

**Total to v1.0:** ~**20–30 focused dev-days**, sequenced so v0.1–v0.2 already give you something to put in a design partner's hands.

---

## Three biggest technical risks & how to de-risk

### Risk 1 — RLS tenancy mistakes leak data across customers 🔴

A wrong or missing policy means Customer A sees Customer B's clients. This is the existential SaaS risk.

- **De-risk:** one `current_org()` helper used by _every_ policy (no per-table bespoke logic); deny-by-default; write an automated RLS test that seeds **two** orgs and asserts each can't read the other (run in CI); run `get_advisors` (security) after every DDL; review the generated policy list as a checklist before each deploy.

### Risk 2 — The offline outbox breaks under auth + tenancy 🔴

Today the outbox assumes one user and never-expiring access. With auth: tokens expire, queued writes can 401 on flush, and a write must carry the org it was created under.

- **De-risk:** stamp `org_id` (and capture the acting user) **at enqueue**, not flush; on flush, treat 401 as retryable _after_ a silent session refresh; add a test for the offline → token-expired → reconnect → flush path; never let an auth failure silently drop a queued write (surface it in the existing Sync-issues screen).

### Risk 3 — Migrating the live single-tenant data into the multi-tenant world 🟠

The deployed app has real rows owned by the placeholder user. Turning on auth can orphan them or lock you out of your own data.

- **De-risk:** do it on a **Supabase branch database** first (cheap, isolated); write the migration to assign all existing rows to a seed org tied to your real login _before_ dropping anon policies; keep the migration reversible; take a backup; verify row counts pre/post.

---

## v0.1 status — BUILT & validated on a local stack (not yet on prod)

Implemented on branch `feat/v0.1-multitenant`, validated against a throwaway
local Supabase stack (full Auth + Postgres + PostgREST). **Production was not
touched and the deployed app was not changed.**

- [x] `0011_org_tenancy.sql` — organizations, memberships, `current_org()`, `org_id` on all 14 tables (+ seed-org backfill), signup trigger. Additive/non-breaking.
- [x] `0012_auth_on.sql` — `org_id` NOT NULL + `current_org()` default, single org-membership policy on every table, business_settings re-keyed to org, org-prefixed Storage RLS, recurrence RPC carries org.
- [x] `supabase/tests/rls_isolation.sql` — two-tenant leak test (read/update/delete/detect): **PASS**.
- [x] App: `/login` (sign in + sign up), restored `_authed` guard, `src/features/auth/`, outbox 401-refresh-and-retry, org-prefixed photo/logo paths, business_settings keyed by org, Sign-out (clears session + local caches).
- [x] End-to-end proof through the real app: signed up two businesses; second sees zero of the first's rows.

### Production cutover runbook (do this deliberately, you pull the trigger)

> Prod today: auth OFF, ~5 placeholder-owned rows (4 starter inventory + 1 settings). The breaking switch requires login, so order matters.

1. **Back up** prod (Supabase dashboard → Database → Backups, or `pg_dump`).
2. **Apply `0011` only** (additive) via the Supabase MCP `apply_migration`. The live app keeps working — anon policies are untouched. Verify the seed org exists and every table's `org_id` is backfilled.
3. **Create your login**: deploy the branch to a preview URL (or run locally against prod), open `/login`, sign up. The trigger makes a _fresh empty_ org for you.
4. **Adopt the seed data into your org** (one SQL statement): repoint your membership to the seed org **or** re-stamp the 5 seed rows to your new org, then delete the empty one. (At ~5 throwaway rows you may simply skip this and re-seed.)
5. **Apply `0012`** (the cutover). Anon access is now gone; the app requires login.
6. **Switch hosting env**: the deployed app's Supabase key is already the publishable key; no change needed. Confirm login works on the live URL.
7. **Run `get_advisors` (security)** and re-run the RLS test shape against prod.
8. **Rollback path** if needed: `0012` is reversible by re-adding the anon policies + placeholder default; keep that revert SQL ready before step 5.

To shut the local validation stack down: `npx supabase stop`.

---

## Appendix — what NOT to build (guardrails against scope creep)

- ❌ Custom-object / metadata engine — the thing that makes Twenty _Twenty_. Your fixed schema is the product and the moat.
- ❌ GraphQL server — PostgREST + generated types already give you typed access.
- ❌ Heavyweight job worker (BullMQ/Redis) — `pg_cron` + Edge Functions cover every sweep you need at this scale.
- ❌ Multi-user, customer portal, automations builder, reporting/BI — all real, all later, none v1.

**Guiding line:** every feature must answer _"will a solo landscaper pay for this in the next 30 days?"_ If not, it waits.
