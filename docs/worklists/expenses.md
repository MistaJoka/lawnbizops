# Expenses — worklist

Screens: [new](../../src/routes/_authed/expenses/new.tsx) ·
[detail](../../src/routes/_authed/expenses/$expenseId.tsx) ·
data: `src/features/expenses/categories.ts`

Apply all four rubric lenses (README) to each item.

- [ ] New + detail: edge padding `px-edge`; heading `heading-stencil`.
- [ ] Amount is cents; formatted only via `src/lib/format.ts`; input uses `tabular-nums`.
- [ ] Date via `localToday()`, date-only, never UTC midnight.
- [ ] Category picker: glove-sized targets; selected state uses tokens; covers `categories.ts` fully.
- [ ] Fields use `Field`; writes via `enqueue()` with `crypto.randomUUID()`; submit disabled while pending.
- [ ] Receipt photo (if present) has loading/error states and is lazy-loaded.
- [ ] Delete uses `ConfirmDialog`; loading uses `Skeleton`.
