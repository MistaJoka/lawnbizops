# Estimates — worklist

Screens: [new](../../src/routes/_authed/estimates/new.tsx) ·
[detail](../../src/routes/_authed/estimates/$estimateId.tsx) ·
components: `EstimateStatusChip.tsx`, `EstimatePdf.tsx`, `photos.ts`, `share.ts`

Apply all four rubric lenses (README) to each item.

- [x] Detail: edge padding `px-edge`; heading `heading-stencil`; status via `EstimateStatusChip`. _(verified 2026-07-19, already correct: root `px-edge pt-6`, h1 `heading-stencil`, `EstimateStatusChip` beside the title.)_
- [x] Line items align into columns; amounts use `tabular-nums` and right-align; totals stand out. _(done 2026-07-19: line amounts + qty×price now `tabular-nums` and right-aligned; Total span `tabular-nums`; same on the public /e approval page. Total already heading-stencil text-3xl.)_
- [x] Money is cents end-to-end; formatted only via `src/lib/format.ts`. _(done 2026-07-19: parseDollarsToCents in / formatCents out throughout; the public approval page's total now rounds per line (approvalTotalCents) so fractional quantities match app-side lineTotalCents exactly — approval.test.ts pins it.)_
- [x] New: fields use `Field`; new estimate + line items get `crypto.randomUUID()`; writes via `enqueue()`. _(verified 2026-07-19, already correct: all inputs in Field, line keys + rows crypto.randomUUID(), saveEstimate enqueues upserts.)_
- [x] Photos: add/remove has loading + error states; thumbnails uniform; lazy-loaded. _(done 2026-07-19: uploading/error states + aspect-square grid were already right; thumbnails now `loading="lazy"`.)_
- [x] PDF + share: generation is lazy (not on critical render path); share has a disabled-while-working state. _(verified 2026-07-19, already correct: @react-pdf + EstimatePdf are dynamic imports inside handleSharePdf; button disabled while `sharing`.)_
- [x] Empty line items uses `EmptyState`; loading uses `Skeleton`. _(done 2026-07-19: zero-line-item card now renders EmptyState; loading already SkeletonDetail.)_
- [x] Primary CTA (`Send`/`Convert`) is `bg-blaze`; destructive uses `ConfirmDialog`. _(verified 2026-07-19, already correct: Email-estimate (draft), Send-approval-link, and Convert are bg-blaze; photo delete routes through confirm().)_

## Flow — lead→done (from e2e-audit-2026-06-24)

- [x] New: add `validateSearch` for `clientId`/`propertyId` and **prefill + skip** those selectors (match `jobs/new`). _(done 2026-06-25, verified in demo)_
- [x] Detail (accepted): add **"Create schedule"** path (not just job/invoice); when job path is blocked by no property, show an inline **"Add property"** affordance. _(done 2026-06-25, verified in demo)_
- [x] Detail: "Create job"/"Create schedule" pass service, price, title, property as search params so the target form prefills. _(done 2026-06-25: schedule carries property+price (verified $775→form); job already carries price/title/notes via createJobFromEstimate. NOTE: service_id not carried — estimates are line-item-based, no single service.)_
- [x] Add **"Renew estimate"** (clone to new draft, fresh valid-until) for declined/expired. _(done 2026-06-25: also shows for sent-past-valid; renewEstimate unit-tested. Demo can't show the status-gated button live — fake backend re-serves seed status on refetch.)_
- [x] Add **"Send via email/SMS"** action (mailto/sms deep link first) that also stamps `sent`. _(done 2026-07-19, upgraded past the deep-link plan: real server-side email via email_outbox + send-email edge fn (Resend) with the approval link embedded; "Email estimate" on detail flips draft→sent optimistically, server stamps `sent_at` at actual delivery + doc_sent activity. SMS stays the existing share/deep-link path.)_
