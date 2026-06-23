# Ship-Readiness Backlog

**Purpose:** the single ranked punch list a `/loop` drains top-down toward the
Phase E go-live. One iteration = the top unchecked item → full gate → commit →
check it off. Baseline captured 2026-06-23: typecheck/lint/test all green
(150 tests, 20 files); DB advisors are almost entirely the known auth-OFF state.

## Loop rules (read every iteration)

- Do the **top unchecked `[ ]` item only**. Don't skip ahead or batch.
- Use TDD where it's testable: write the failing test first, then the fix.
- Gate before commit: `npx prettier --write . && npm run lint && npm test && npm run build`.
- If the item touches any RLS policy, also run `supabase/tests/rls_isolation.sql` — must stay PASS.
- Commit one focused change, then check the box (`[x]`) and add a one-line note.
- **STOP and surface to the human** if: the gate fails in a way you can't fix
  in-iteration, you find a money/RLS correctness bug (flag it, don't silently
  patch), the item is marked 🔒 supervised, or you run out of unchecked items.
- Do **not** add roadmap features, refactor broadly, or run the auth cutover.

---

## P0 — Money & state correctness (test the write paths)

These are optimistic `setQueryData` + `enqueue` paths where a bug corrupts money
or status. For each: assert correct integer cents, date-only strings, client
UUID id, **no** `user_id`/`created_at`/`updated_at` in the payload, and correct
status transition.

- [x] Payments apply — `apply_payment` write path: balance + status flip (paid / partially_paid) — `recordPayment.test.ts`, 6 cases; behavior was already correct, no bug
- [x] Invoices — create/send/void write paths and INV-n numbering expectations — `invoiceWrites.test.ts`, 8 cases (FIFO enqueue, number-null/no-timestamp payloads, void→job-restore); behavior already correct
- [x] Clients — create/edit/archive write path — `clientWrites.test.ts`, 6 cases (name-sorted insert, clean upsert payload, archive drop, stage update + activity, same-stage no-op); behavior already correct
- [x] Jobs — status pipeline transitions beyond what `board/` already covers — `jobWrites.test.ts`, 5 cases (done stamps completed_at, cancel drops off kanban, patch payload clean, reschedule day-cache move); behavior already correct
- [x] Schedules — recurrence create/edit + materialization trigger — `scheduleWrites.test.ts`, 6 cases (save→materialize_jobs vs edit→resync_schedule, clean payload, pause/resume, delete FIFO jobs-before-schedule); behavior already correct
- [x] Tax — tax write paths and rounding at cents — `taxWrites.test.ts`, 6 cases (mileage/set-aside rounding + negative floor, mileage & 1099 create/delete clean payloads, name-sorted insert); behavior already correct
- [→] Profitability — moved to "Needs local Supabase stack" below: the derivation is the SQL RPC `job_profitability`/`client_profitability` (migration 0028), not client code, so it can't be a gated client unit test
- [x] Inventory — stock adjust + reorder-level write path — `inventoryWrites.test.ts`, 6 cases (stockLevel critical/low/in_stock thresholds, name-sorted upsert clean payload, quantity adjust floored at zero); behavior already correct

## P1 — Critical libs without tests

- [ ] `src/lib/geocode.ts` — OSM Nominatim parse + failure/empty handling
- [ ] `src/lib/db.ts` — Dexie schema/outbox table shape
- [ ] `src/lib/preferences.ts` — read/write/default behavior

## P1 — Frontend / UX health (audit per route, one route per iteration)

For each `src/routes/_authed/*`: confirm loading, empty, and error states exist;
tap targets are glove-sized; dark-theme tokens (bg-canvas/panel, text-sand/faded)
used, no hardcoded colors. Add the missing state or fix the token; write a note.

- [ ] dashboard
- [ ] clients (list + detail)
- [ ] jobs / board / pipeline
- [ ] estimates
- [ ] invoices
- [ ] money (payments)
- [ ] schedule / schedules
- [ ] expenses
- [ ] tax
- [ ] inventory
- [ ] properties
- [ ] settings

## P1 — Resilience

- [ ] App-level error boundary renders a recoverable fallback (test it)
- [ ] Outbox failure surfaces to the user (poison-op quarantine has visible UX)
- [ ] Offline cold-start path verified (cache persister + outbox replay)

## P2 — DB hygiene (defer index pruning until prod has data)

- [ ] Add primary key to `business_settings` (perf advisor 0004)
- [ ] 🔒 Review unused indexes — **do NOT drop pre-launch**; revisit after real traffic

## P2 — Config / security (independent of cutover)

- [ ] Enable leaked-password protection in Supabase Auth (config; matters once auth is on)
- [ ] Decide server-side schedule sweep (Edge Function vs client `materialize_jobs`) — write a short ADR note, don't build yet

## ⏸ Needs local Supabase stack (SQL fixture tests — out of the client loop)

Server-side money math lives in SQL RPCs/views; correctness needs pgTAP fixture
tests run against `supabase start` / `db reset`, which `npm test` can't gate.
Batch these into one supervised local-stack session rather than the client loop.

- [ ] Profitability — `job_profitability` (billed) + `client_profitability` (collected) on a seeded fixture
- [ ] P&L / cash-basis accounting derivations (migration 0028+)
- [ ] `apply_payment` balance/status recompute (the RPC body, not the client cache)
- [ ] `materialize_jobs` / `resync_schedule` recurrence output on a seeded schedule

## 🔒 SUPERVISED — Phase E go-live cutover (NOT loop work)

Listed here for completeness so the loop knows the destination and skips it.
These are irreversible / require human judgment — surface, don't execute.

- [ ] 🔒 Turn auth ON (signup/login), per `docs/crm-roadmap.md` Phase E
- [ ] 🔒 Remove temp `anon` RLS policies on all tables (resolves the bulk of security advisors)
- [ ] 🔒 Flip prod to multi-tenant `current_org()` stamping
- [ ] 🔒 Final `get_advisors` security pass — expect the warn count to collapse
