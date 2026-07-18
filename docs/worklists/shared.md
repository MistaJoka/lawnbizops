# Shared components — worklist

Components in `src/components/`: `TabBar`, `Fab`, `StatusChip`, `EmptyState`,
`Skeleton`, `Toast`, `Sheet`, `ConfirmDialog`, `Field`, `Toggle`,
`ActivityTimeline`, `JobStepper`, `QueryError`, `AppErrorFallback`.

These are leverage points — fixing one improves every screen. Apply all four
rubric lenses (README).

- [ ] TabBar: items evenly spaced, active state uses tokens, all targets ≥44px, safe-area inset respected.
- [ ] Fab: consistent position/size across screens; ≥44px; `bg-blaze`; doesn't cover content/TabBar.
- [ ] StatusChip: every status value maps to a token color; consistent padding/radius/size.
- [ ] EmptyState: consistent icon/title/body/CTA layout; CTA is `bg-blaze`.
- [ ] Skeleton: matches the shape of the content it stands in for (no layout shift on load).
- [ ] Toast: readable contrast; auto-dismiss timing sane; stacking handled.
- [ ] Sheet: backdrop, drag/close affordance, safe-area inset, scroll lock.
- [ ] ConfirmDialog: destructive action styled `text-alert`; cancel is the safe default focus.
- [ ] Field: label association (`htmlFor`/`id`), error slot, consistent spacing; used everywhere inputs appear.
- [ ] Toggle: ≥44px hit area; on/off states use tokens; accessible role/label.
- [ ] ActivityTimeline: entries align; timestamps `tabular-nums`; empty uses `EmptyState`.
- [ ] QueryError / AppErrorFallback: consistent layout, retry action, tokenized colors.

## Flow — lead→done (from e2e-audit-2026-06-24)

- [ ] Add a **global quick-create FAB** (or 6th "More" nav target) reaching New client / Estimate / Job / Invoice / Expense from anywhere — today only "+ Job" is global; Estimates/Dispatch/Tools/Inventory/Tax/Reports are single-deep-link-only and undiscoverable.
- [ ] Reusable **"next-step success sheet"** component for post-save forward momentum (property/estimate/schedule).
- [ ] Schedule edit: `ConfirmDialog` when `resync_schedule()` would drop future jobs that have notes/checklist customizations.

## Correctness — from e2e-audit-2026-06-24 (verify before billing changes)

- [x] Add `unique(estimate_id)` partial index on `invoices` (defense-in-depth vs offline double-convert; UI already guards the button). _(done 2026-07-18: migration 0035 `invoices_estimate_id_key`.)_
- [x] Void invoice with recorded payments: warn so collected revenue can't count a voided invoice. _(done 2026-06-25: void confirm names the recorded-payment total. 2026-07-18: voidInvoice now auto-reverses unreversed payments before the void flip — FIFO keeps reversals ahead of the status change; covered in invoiceWrites.test.ts.)_
- [x] Schedule resync: add a `customized_at` guard (or ConfirmDialog naming affected visits) so editing a schedule doesn't silently delete edited future jobs (`0005` resync deletes all future `scheduled` jobs). _(done 2026-07-18: migration 0035 adds `jobs.customized_at` + resync skips stamped rows; reschedule/checklist edits on recurring jobs stamp it — jobWrites.test.ts.)_
- [ ] Extend job materialization horizon (~6mo) + auto-extend on load when `last_materialized_through` is near; consider a pg_cron top-up.
- [x] Outbox terminal failure: surface a visible toast/banner + one-tap retry with the error reason (today it only shows in Settings → Sync). _(done 2026-07-18: poison ops now raise a toast pointing at Settings → Sync issues, where retry/discard already live.)_
