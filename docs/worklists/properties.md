# Properties — worklist

Screens: [new](../../src/routes/_authed/properties/new.tsx) ·
[detail](../../src/routes/_authed/properties/$propertyId.index.tsx) ·
[edit](../../src/routes/_authed/properties/$propertyId.edit.tsx) ·
form: `src/features/properties/PropertyForm.tsx`

Apply all four rubric lenses (README) to each item.

- [ ] Detail + edit: edge padding `px-edge`; heading `heading-stencil`.
- [ ] Detail: address/measurements align into columns; numeric values use `tabular-nums`.
- [ ] Detail: link back to owning client is obvious and tappable (≥44px).
- [ ] PropertyForm: fields use `Field`; map/geo inputs have labels and sane empty states.
- [ ] Writes via `enqueue()` with client-generated id; no DB-owned columns in payload.
- [ ] Loading uses `Skeleton`; errors use `QueryError`.
- [ ] Colors are tokens; primary CTA `bg-blaze`.
