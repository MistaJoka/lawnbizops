# Clients — worklist

Screens: [list](../../src/routes/_authed/clients/index.tsx) ·
[new](../../src/routes/_authed/clients/new.tsx) ·
[detail](../../src/routes/_authed/clients/$clientId.index.tsx) ·
[edit](../../src/routes/_authed/clients/$clientId.edit.tsx) ·
[import](../../src/routes/_authed/clients/import.tsx) ·
form: `src/features/clients/ClientForm.tsx`

Apply all four rubric lenses (README) to each item.

- [ ] List: edge padding uses `px-edge`; header uses `heading-stencil`.
- [ ] List: empty state uses `EmptyState` with an "Add client" CTA; loading uses `Skeleton`.
- [ ] List: each row's tap target is full-width and ≥44px; phone/value text uses `tabular-nums`.
- [ ] Detail: label/value rows align into clean columns; status via `StatusChip`.
- [ ] Detail: any delete/archive goes through `ConfirmDialog`.
- [ ] ClientForm: every field wrapped in `Field` with a real label; submit disabled while pending.
- [ ] ClientForm + edit: writes go through `enqueue()`; new rows get `crypto.randomUUID()`; no `user_id/created_at/updated_at` in payload.
- [ ] Import: progress/empty/error states present; large lists windowed; malformed rows surfaced, not silently dropped.
- [ ] All screens: colors are tokens only (no `gray-*`/hex); primary CTA is `bg-blaze`.

## Flow — lead→done (from e2e-audit-2026-06-24)

- [x] Detail: add a primary **"Create estimate"** CTA (→ `/estimates/new?clientId=$id`) — for a lead this is the top missing action. _(done 2026-06-25: blaze CTA, carries propertyId when single)_
- [x] Detail: add **"Schedule work"** / **"New job"** CTAs carrying `clientId` (and propertyId when one property). _(done 2026-06-25: jobs/new now accepts ?clientId; verified in demo)_
- [x] ClientForm: default stage to **lead** when arrived from a lead/pipeline context (`?lead=1`). _(done 2026-07-19: `/clients/new?lead=1` validateSearch → `defaultLead` prop starts the lead toggle on; pipeline empty-state "Add client" carries it.)_

## Stage criteria — from pipeline-stage-spec (2026-06-25)

- [x] ClientForm: require **at least one contact channel** (phone OR email) — today only `name` is required, so a lead can't be quoted/invoiced/reminded (G-A1). _(done 2026-06-25: soft inline warning, non-blocking per readiness-model philosophy; verified shows/clears in demo)_
- [x] Client/lead detail: **readiness chips** ("needs: ☐ contact ☐ property ☐ estimate"), each chip opening the prefilled producing component (G-B1 / stage-readiness model). _(done 2026-07-19: chips row on lead/quoted detail → edit / properties/new / estimates/new deep links; unknown data suppresses the chip, all-met renders nothing.)_
