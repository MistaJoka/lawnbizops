# Jobs — worklist

Screens: [new](../../src/routes/_authed/jobs/new.tsx) ·
[detail](../../src/routes/_authed/jobs/$jobId.tsx) ·
components: `src/features/jobs/JobActions.tsx`, `JobChecklist.tsx`,
`src/components/JobStepper.tsx`

Apply all four rubric lenses (README) to each item.

- [ ] Detail: edge padding `px-edge`; heading `heading-stencil`; status via `StatusChip`.
- [ ] JobStepper: stages align evenly; current/done/upcoming states visually distinct using tokens.
- [ ] JobActions: primary action is `bg-blaze`; destructive actions use `ConfirmDialog`; all ≥44px.
- [ ] JobChecklist: check toggles are glove-sized; completed items styled with `text-go`, not raw color.
- [ ] Money fields (price/cost) handled as cents; formatted only via `src/lib/format.ts`.
- [ ] Dates (scheduled/completed) via `localToday()`, date-only, never UTC midnight.
- [ ] All writes via `enqueue()`; optimistic `setQueryData` shape matches server row.
- [ ] Loading uses `Skeleton`; empty checklist uses `EmptyState`.

## Stage criteria — from pipeline-stage-spec (2026-06-25)

- [ ] Marking a job **done/billable**: warn when `price_cents`=0 or `service_id` is null (prevents $0 invoice lines + untracked revenue-by-service) (G-D2/E1).
- [ ] Job status: discourage `scheduled → done` skipping `in_progress` (no real work captured); consider requiring a tap-through (G-D3).
