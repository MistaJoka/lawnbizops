# Tax — worklist

Screens: [overview](../../src/routes/_authed/tax/index.tsx) ·
[mileage new](../../src/routes/_authed/tax/mileage.new.tsx) ·
[payee new](../../src/routes/_authed/tax/payees.new.tsx)

Apply all four rubric lenses (README) to each item.

- [x] Overview: edge padding `px-edge`; heading `heading-stencil`; totals `tabular-nums`, right-aligned. _(done 2026-07-19: set-aside, miles YTD, and deduction figures now tabular-nums; layout was already right.)_
- [x] Money is cents; deductions/rates formatted only via `src/lib/format.ts`. _(verified 2026-07-19, already correct: mileage rate stored as cents, formatCents everywhere.)_
- [x] Mileage: distance + date inputs validated; date via `localToday()`; mileage-rate math correct. _(verified 2026-07-19, already correct: canSave requires miles > 0 and non-NaN; droveOn defaults/falls back to localToday(); deduction = miles × rate_cents, pinned by taxWrites.test.ts.)_
- [x] Payee: fields use `Field`; writes via `enqueue()` with `crypto.randomUUID()`; no DB-owned columns. _(verified 2026-07-19, already correct in features/tax/hooks.ts.)_
- [x] Empty/loading/error states use `EmptyState`/`Skeleton`/`QueryError`. _(verified 2026-07-19, acceptable: in-card empty sections use the compact-text pattern (same deliberate call as money/reports cards); totals render zeros meaningfully.)_
- [x] Primary CTA `bg-blaze`; destructive uses `ConfirmDialog`. _(verified 2026-07-19, already correct: PrimaryButton saves; mileage delete routes through confirm().)_
