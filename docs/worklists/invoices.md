# Invoices — worklist

Screens: [new](../../src/routes/_authed/invoices/new.tsx) ·
[detail](../../src/routes/_authed/invoices/$invoiceId.tsx) ·
components: `InvoiceStatusChip.tsx`, `InvoicePdf.tsx`, `share.ts`

Apply all four rubric lenses (README) to each item.

- [ ] Detail: edge padding `px-edge`; heading `heading-stencil`; status via `InvoiceStatusChip`.
- [ ] Line items + payments align into columns; amounts `tabular-nums`, right-aligned; balance-due stands out.
- [ ] Money is cents end-to-end; formatted only via `src/lib/format.ts`. Verify against `recordPayment`/`reversePayment` tests.
- [ ] Record payment: amount input validates ≤ balance; write via `enqueue()`; optimistic balance updates.
- [ ] Reverse payment: routed through `ConfirmDialog`; reverts cleanly on failure.
- [ ] New: fields use `Field`; new invoice + lines get `crypto.randomUUID()`; no DB-owned columns in payload.
- [ ] PDF + share lazy-loaded with disabled-while-working state.
- [ ] Empty/loading/error states use `EmptyState`/`Skeleton`/`QueryError`.
