# Inventory — worklist

Screens: [index](../../src/routes/_authed/inventory/index.tsx) ·
feature: `src/features/inventory/hooks.ts`

Apply all four rubric lenses (README) to each item.

- [ ] Edge padding `px-edge`; heading `heading-stencil`.
- [ ] List rows align into columns; quantities/costs use `tabular-nums`; low-stock flagged with `text-alert`.
- [ ] Costs are cents; formatted only via `src/lib/format.ts`.
- [ ] Add/edit/adjust writes via `enqueue()` with `crypto.randomUUID()`; optimistic update matches server shape.
- [ ] Quantity steppers are glove-sized (≥44px); inputs use `Field`.
- [ ] Empty uses `EmptyState` with add CTA; loading uses `Skeleton`.
- [ ] Long lists windowed/paginated.
