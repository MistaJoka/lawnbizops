# Expenses — worklist

Screens: [new](../../src/routes/_authed/expenses/new.tsx) ·
[detail](../../src/routes/_authed/expenses/$expenseId.tsx) ·
data: `src/features/expenses/categories.ts`

Apply all four rubric lenses (README) to each item.

- [x] New + detail: edge padding `px-edge`; heading `heading-stencil`. _(verified 2026-07-19, already correct.)_
- [x] Amount is cents; formatted only via `src/lib/format.ts`; input uses `tabular-nums`. _(done 2026-07-19: amount input now tabular-nums — TextInput learned to merge a className for it; parse/format were already cents-only.)_
- [x] Date via `localToday()`, date-only, never UTC midnight. _(verified 2026-07-19, already correct: spentOn defaults to and falls back to localToday().)_
- [x] Category picker: glove-sized targets; selected state uses tokens; covers `categories.ts` fully. _(verified 2026-07-19, already correct: min-h-touch chips mapped from EXPENSE_CATEGORIES, token-only selected state.)_
- [x] Fields use `Field`; writes via `enqueue()` with `crypto.randomUUID()`; submit disabled while pending. _(verified 2026-07-19, already correct: expenses hooks enqueue upsert/update with randomUUID ids; save disabled until valid + while busy.)_
- [x] Receipt photo (if present) has loading/error states and is lazy-loaded. _(done 2026-07-19: upload/error states were already right; receipt img now loading="lazy".)_
- [x] Delete uses `ConfirmDialog`; loading uses `Skeleton`. _(verified 2026-07-19, already correct: destructive confirm() + SkeletonDetail.)_
