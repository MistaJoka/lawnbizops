# Core CRUD: edit / correct / undo — scoped plan

**Date:** 2026-06-18
**Status:** Scoped (pre-implementation)

## Problem

The audit found the fundamentals are create + read + workflow-actions deep, but
the **edit / correct / undo** half is missing on the three money-bearing
entities. Workarounds today are destructive (cancel-and-recreate, void-and-
rebuild) or impossible (no payment reversal). This plan closes that gap.

Principles carried throughout: every write goes through `enqueue()` (iron rule)
with optimistic `setQueryData`; edit screens **reuse the existing create forms**
rather than fork them; finalized (sent) invoices stay immutable — correction
there is **void-and-reissue**, which is correct bookkeeping.

Sequence is sharpest-and-smallest first: **A → B → C**.

---

## Workstream A — Reversible payments (sharpest, smallest)

**Why:** a mis-keyed amount/method has no fix today except voiding the whole
invoice (losing its number + history).

**Approach:** an offsetting payment line. `apply_payment` already recomputes
invoice status from `invoice_balances` (which sums payments), so a negative
payment makes `paid` drop and status flip back — append-only and auditable.

**Changes**

- **Migration `NNNN_payment_reversal.sql`** — relax the constraint from
  `amount_cents > 0` to `amount_cents <> 0` (allow offsetting lines). No change
  to `apply_payment` — it handles the negative + recompute as-is. Apply local →
  `rls_isolation` + `invariants` green → apply prod → `get_advisors`.
- **`invoices/hooks.ts` `reversePayment(payment)`** — optimistic: `paid_cents -=
amount`, recompute `status` in the `['invoices']` + `['invoices', id]` caches;
  enqueue `apply_payment` RPC with `{ p_id: new uuid, p_amount_cents: -amount,
p_method, p_paid_at: localToday(), p_note: 'Reversal of <id>' }`.
- **`invoices/$invoiceId.tsx`** — each non-reversal payment row gets a **Reverse**
  action (confirm dialog); reversal lines render as negative, greyed.

**Tests:** unit (reversePayment cache math: paid drops, `paid`→`partially_paid`/
`sent`); e2e (record payment → reverse → balance restored, status back); the
`paid_cents = Σ payments` and balance invariants still hold with a negative line
(add a reversal case to `invariants.sql`).

**Effort:** S · **Risk:** low (one constraint change + reuse of the RPC).

---

## Workstream B — Job edit (hit daily)

**Why:** after creation a job's date/status/checklist can change, but not
**price, title, service, start time, notes, or property** — the on-site "extra
$20 of hauling" or a typo forces cancel-and-recreate (losing history/links).

**Changes**

- **`jobs/hooks.ts` `updateJob(job, patch)`** — `patchJobCaches(job, patch)`
  (already handles the date-move + kanban cache) + `enqueue({ table:'jobs',
kind:'update', payload:{ id, patch } })` for `price_cents | title | service_id
| start_time | notes | scheduled_date`.
- **Extract the new-job form** (`jobs/new.tsx` `NewJobScreen`) into a shared
  `JobForm` taking `mode: 'create' | 'edit'` + initial values; create calls
  `createOneOffJob`, edit calls `updateJob`.
- **Route `jobs/$jobId.edit.tsx`** — loads via `useJob`, pre-fills `JobForm`.
- **`jobs/$jobId.tsx`** — add an **Edit** link to `/jobs/$id/edit`.

**Tests:** unit (`updateJob` patches id/date/kanban caches); e2e (edit a job's
price → reflected on the board card + detail).

**Effort:** M (form extraction) · **Risk:** low.

---

## Workstream C — Draft editing + void-and-reissue (biggest)

**Why:** a draft estimate/invoice can't be amended — spot a wrong/missing line
and you rebuild from scratch. Sent invoices correctly shouldn't be edited, but
there's no clean correction path.

**Changes**

- **Extract a shared `LineItemEditor`** from `estimates/new.tsx` /
  `invoices/new.tsx` (add/remove/edit qty × unit price rows; live total).
- **`estimates/hooks.ts` `updateEstimate(detail, input)`** — guard
  `status === 'draft'`; update estimate fields (notes, valid_until) and **replace
  items** (FIFO via outbox: delete removed item rows, upsert changed/new); update
  caches. **Route `estimates/$id.edit.tsx`** reuses the form; detail shows
  **Edit** only while draft.
- **`invoices/hooks.ts` `updateInvoice(detail, input)`** — same, draft-guarded.
  **Route `invoices/$id.edit.tsx`**; **Edit** shown only while draft.
- **`invoices/hooks.ts` `reissueInvoice(detail)`** — for sent/void: `voidInvoice`
  the original + build a new **draft** cloned from its items (reuse the
  `createInvoiceFromJobs` cache/enqueue shapes), navigate to the new draft.
  Invoice detail shows **Void & reissue** when sent.

**Tests:** unit (item replace add/remove/change nets correct total; `reissue`
clones items + voids original); e2e (edit a draft estimate line → total updates;
void-and-reissue an invoice → new draft, same items, original voided).

**Effort:** L (shared editor + 2 edit routes + reissue) · **Risk:** medium —
item replace ordering (delete-before-insert through the FIFO outbox) and the
draft-only guard need care; covered by the round-trip tests.

---

## Cross-cutting

- **Outbox discipline:** all mutations enqueue; item replacement preserves FIFO
  (parent before children) exactly like `createInvoiceFromJobs`.
- **Reuse over fork:** B and C extract shared form/editor components from the
  existing create screens — no parallel UIs to drift.
- **Coverage:** each workstream adds unit + e2e; A also re-runs RLS + invariants
  and applies a prod migration. Bundle/lint/a11y gates already guard regressions.
- **Verification per workstream:** `prettier && lint && test && build`, the e2e
  suite on a fresh seed, and a live preview walkthrough of the new edit/correct
  path.

## Out of scope (deliberately)

- Editing a **sent** invoice in place (void-and-reissue instead — correct
  bookkeeping).
- Hard-deletes (archive/void/cancel remain the soft-delete model).
