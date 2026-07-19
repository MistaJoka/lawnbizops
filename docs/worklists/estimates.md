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

- [x] New: add `validateSearch` for `clientId`/`propertyId` and **prefill + skip** those selectors (match `jobs/new`). _(done 2026-06-25, verified in demo)_
- [x] Detail (accepted): add **"Create schedule"** path (not just job/invoice); when job path is blocked by no property, show an inline **"Add property"** affordance. _(done 2026-06-25, verified in demo)_
- [x] Detail: "Create job"/"Create schedule" pass service, price, title, property as search params so the target form prefills. _(done 2026-06-25: schedule carries property+price (verified $775→form); job already carries price/title/notes via createJobFromEstimate. NOTE: service_id not carried — estimates are line-item-based, no single service.)_
- [x] Add **"Renew estimate"** (clone to new draft, fresh valid-until) for declined/expired. _(done 2026-06-25: also shows for sent-past-valid; renewEstimate unit-tested. Demo can't show the status-gated button live — fake backend re-serves seed status on refetch.)_
- [x] Add **"Send via email/SMS"** action (mailto/sms deep link first) that also stamps `sent`. _(done 2026-07-19, upgraded past the deep-link plan: real server-side email via email_outbox + send-email edge fn (Resend) with the approval link embedded; "Email estimate" on detail flips draft→sent optimistically, server stamps `sent_at` at actual delivery + doc_sent activity. SMS stays the existing share/deep-link path.)_
