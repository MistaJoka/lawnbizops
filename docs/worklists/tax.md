# Tax — worklist

Screens: [overview](../../src/routes/_authed/tax/index.tsx) ·
[mileage new](../../src/routes/_authed/tax/mileage.new.tsx) ·
[payee new](../../src/routes/_authed/tax/payees.new.tsx)

Apply all four rubric lenses (README) to each item.

- [ ] Overview: edge padding `px-edge`; heading `heading-stencil`; totals `tabular-nums`, right-aligned.
- [ ] Money is cents; deductions/rates formatted only via `src/lib/format.ts`.
- [ ] Mileage: distance + date inputs validated; date via `localToday()`; mileage-rate math correct.
- [ ] Payee: fields use `Field`; writes via `enqueue()` with `crypto.randomUUID()`; no DB-owned columns.
- [ ] Empty/loading/error states use `EmptyState`/`Skeleton`/`QueryError`.
- [ ] Primary CTA `bg-blaze`; destructive uses `ConfirmDialog`.
