# Invoices — worklist

Screens: [new](../../src/routes/_authed/invoices/new.tsx) ·
[detail](../../src/routes/_authed/invoices/$invoiceId.tsx) ·
components: `InvoiceStatusChip.tsx`, `InvoicePdf.tsx`, `share.ts`

Apply all four rubric lenses (README) to each item.

- [x] Detail: edge padding `px-edge`; heading `heading-stencil`; status via `InvoiceStatusChip`. _(verified 2026-07-19, already correct: root `px-edge pt-6`, h1 `heading-stencil`, chip beside title.)_
- [x] Line items + payments align into columns; amounts `tabular-nums`, right-aligned; balance-due stands out. _(done 2026-07-19: line amounts, qty×price, Total/Paid/Balance, and payment amounts now `tabular-nums` (right alignment was already there); Balance already heading-stencil text-3xl.)_
- [x] Money is cents end-to-end; formatted only via `src/lib/format.ts`. Verify against `recordPayment`/`reversePayment` tests. _(verified 2026-07-19, already correct: parseDollarsToCents in / formatCents out; recordPayment.test.ts + reversePayment.test.ts pin cents math and status recompute.)_
- [x] Record payment: amount input validates ≤ balance; write via `enqueue()`; optimistic balance updates. _(done 2026-07-19: PaymentSheet now rejects amounts over the balance with a message naming the balance due; enqueue via apply_payment RPC + optimistic caches were already right.)_
- [x] Reverse payment: routed through `ConfirmDialog`; reverts cleanly on failure. _(verified 2026-07-19, already correct: handleReverse awaits destructive confirm(); reversal is an append-only negative apply_payment line — a server rejection parks in Sync issues and invalidation rolls the caches back to server truth.)_
- [x] New: fields use `Field`; new invoice + lines get `crypto.randomUUID()`; no DB-owned columns in payload. _(verified 2026-07-19, already correct: all inputs in Field; invoiceWrites.test.ts pins randomUUID ids and no number/user_id/timestamps in payloads.)_
- [x] PDF + share lazy-loaded with disabled-while-working state. _(verified 2026-07-19, already correct: @react-pdf + InvoicePdf dynamic-imported inside handleSharePdf; button disabled while `sharing`.)_
- [x] Empty/loading/error states use `EmptyState`/`Skeleton`/`QueryError`. _(done 2026-07-19: zero-line-item card now EmptyState; detail error now QueryError with retry; loading already SkeletonDetail.)_

## Flow — lead→done (from e2e-audit-2026-06-24)

- [x] Payment form: default **method** to the last-used method, not always `cash`. _(done 2026-06-25: device-local localStorage memory, falls back to cash; unit-tested.)_
- [x] Money aging buckets: add a **one-tap "send reminder"** on overdue invoices (wire the existing `auto_overdue_reminder` setting into a visible action). _(verified 2026-07-19, already covered twice over: Money → Invoices has the "🔔 Nudge overdue (n)" NudgeSheet (per-invoice SMS + recordReminder), and automated overdue-reminder EMAILS now send via automation_sweep + email_outbox behind Settings → Automations.)_
- [ ] Support a **deposit / partial invoice** created from an accepted estimate.
  - _2026-07-19: deferred — needs a schema decision first. Migration 0035 added `unique(invoices.estimate_id)` (double-convert guard), so a deposit invoice would consume the estimate link and block the final invoice. Clean support wants either a `kind` column + relaxed uniqueness or a deposit line convention; punted to a dedicated pass rather than half-shipping._
