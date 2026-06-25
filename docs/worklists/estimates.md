# Estimates — worklist

Screens: [new](../../src/routes/_authed/estimates/new.tsx) ·
[detail](../../src/routes/_authed/estimates/$estimateId.tsx) ·
components: `EstimateStatusChip.tsx`, `EstimatePdf.tsx`, `photos.ts`, `share.ts`

Apply all four rubric lenses (README) to each item.

- [ ] Detail: edge padding `px-edge`; heading `heading-stencil`; status via `EstimateStatusChip`.
- [ ] Line items align into columns; amounts use `tabular-nums` and right-align; totals stand out.
- [ ] Money is cents end-to-end; formatted only via `src/lib/format.ts`.
- [ ] New: fields use `Field`; new estimate + line items get `crypto.randomUUID()`; writes via `enqueue()`.
- [ ] Photos: add/remove has loading + error states; thumbnails uniform; lazy-loaded.
- [ ] PDF + share: generation is lazy (not on critical render path); share has a disabled-while-working state.
- [ ] Empty line items uses `EmptyState`; loading uses `Skeleton`.
- [ ] Primary CTA (`Send`/`Convert`) is `bg-blaze`; destructive uses `ConfirmDialog`.
