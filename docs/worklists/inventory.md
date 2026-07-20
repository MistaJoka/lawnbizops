# Inventory — worklist

Screens: [index](../../src/routes/_authed/inventory/index.tsx) ·
feature: `src/features/inventory/hooks.ts`

Apply all four rubric lenses (README) to each item.

- [x] Edge padding `px-edge`; heading `heading-stencil`. _(verified 2026-07-19, already correct.)_
- [x] List rows align into columns; quantities/costs use `tabular-nums`; low-stock flagged with `text-alert`. _(done 2026-07-19: quantities + summary counts now tabular-nums; low-stock already token-badged alert/khaki.)_
- [x] Costs are cents; formatted only via `src/lib/format.ts`. _(verified 2026-07-19, n/a-correct: inventory tracks quantity/unit only — no money fields exist on the model.)_
- [x] Add/edit/adjust writes via `enqueue()` with `crypto.randomUUID()`; optimistic update matches server shape. _(verified 2026-07-19, already correct in features/inventory/hooks.ts.)_
- [x] Quantity steppers are glove-sized (≥44px); inputs use `Field`. _(done 2026-07-19: +Add/Use-1 steppers were ~36px — now min-h-11; add-sheet inputs already Field; search input gains an aria-label.)_
- [x] Empty uses `EmptyState` with add CTA; loading uses `Skeleton`. _(done 2026-07-19: true-empty now renders EmptyState with an + Add item CTA (filtered no-match keeps the compact line); loading renders SkeletonList.)_
- [x] Long lists windowed/paginated. _(verified 2026-07-19, acceptable as-is: inventory is a bounded personal SKU list (tens of rows); flagged for revisit only if usage proves otherwise.)_
