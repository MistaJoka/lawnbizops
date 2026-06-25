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

## Flow — lead→done (from e2e-audit-2026-06-24)

- [x] New: add `validateSearch` for `clientId`/`propertyId` and **prefill + skip** those selectors (match `jobs/new`). *(done 2026-06-25, verified in demo)*
- [x] Detail (accepted): add **"Create schedule"** path (not just job/invoice); when job path is blocked by no property, show an inline **"Add property"** affordance. *(done 2026-06-25, verified in demo)*
- [x] Detail: "Create job"/"Create schedule" pass service, price, title, property as search params so the target form prefills. *(done 2026-06-25: schedule carries property+price (verified $775→form); job already carries price/title/notes via createJobFromEstimate. NOTE: service_id not carried — estimates are line-item-based, no single service.)*
- [ ] Add **"Renew estimate"** (clone to new draft, fresh valid-until) for declined/expired.
- [ ] Add **"Send via email/SMS"** action (mailto/sms deep link first) that also stamps `sent`.
