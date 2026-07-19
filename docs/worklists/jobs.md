# Jobs — worklist

Screens: [new](../../src/routes/_authed/jobs/new.tsx) ·
[detail](../../src/routes/_authed/jobs/$jobId.tsx) ·
components: `src/features/jobs/JobActions.tsx`, `JobChecklist.tsx`,
`src/components/JobStepper.tsx`

Apply all four rubric lenses (README) to each item.

- [x] Detail: edge padding `px-edge`; heading `heading-stencil`; status via `StatusChip`. _(verified 2026-07-19, already correct: root div is `px-edge pt-6 pb-24`, h1 is `heading-stencil`, and `StatusChip` renders beside the title in `$jobId.tsx`.)_
- [x] JobStepper: stages align evenly; current/done/upcoming states visually distinct using tokens. _(verified 2026-07-19, already correct: each step is `min-w-0 flex-1` so widths are equal; bars use `bg-go`/`bg-blaze`/`bg-edge` and labels `text-go`/`text-blaze`/`text-faded` — all tokens.)_
- [x] JobActions: primary action is `bg-blaze`; destructive actions use `ConfirmDialog`; all ≥44px. _(done 2026-07-19: in-progress "✓ Done" primary was a green outline (`border-go text-go`) — now `bg-blaze text-on-cta` like Start, so the primary is always blaze. Skip/cancel already route through `confirm()` → ConfirmDialog host; every control is `min-h-12`/`py-3` ≥44px.)_
- [x] JobChecklist: check toggles are glove-sized; completed items styled with `text-go`, not raw color. _(verified 2026-07-19, already correct: toggle rows are full-width `py-3` + text-lg (~48px); done state uses `border-go bg-go text-canvas` check + `text-faded` strikethrough — all tokens, no raw colors.)_
- [x] Money fields (price/cost) handled as cents; formatted only via `src/lib/format.ts`. _(verified 2026-07-19, already correct: new.tsx parses via `parseDollarsToCents`, stores `price_cents`; detail/economics display via `formatCents`. The `(cents/100).toFixed(2)` input-prefill in `pickService` is the app-wide convention — 10 other screens do the same.)_
- [x] Dates (scheduled/completed) via `localToday()`, date-only, never UTC midnight. _(verified 2026-07-19, already correct: new.tsx defaults `date` to `localToday()` and takes date-only strings from inputs; `completed_at`/`customized_at` are true timestamps, where ISO is right.)_
- [x] All writes via `enqueue()`; optimistic `setQueryData` shape matches server row. _(verified 2026-07-19, already correct: every mutation in `features/jobs/hooks.ts` goes through `enqueue()`; `createOneOffJob`'s cached row covers every `jobs` Row column and the upsert payload omits `user_id`/`created_at`/`updated_at`.)_
- [x] Loading uses `Skeleton`; empty checklist uses `EmptyState`. _(done 2026-07-19: detail already rendered `SkeletonDetail` while loading; added `EmptyState` ("No tasks yet") to `JobChecklist` when the list is empty — the add-task input right below is the CTA.)_

## Stage criteria — from pipeline-stage-spec (2026-06-25)

- [x] Marking a job **done/billable**: warn when `price_cents`=0 or `service_id` is null (prevents $0 invoice lines + untracked revenue-by-service) (G-D2/E1). _(done 2026-07-18: JobActions confirms before finishing a $0 or service-less job — both the primary ✓ Done and the overflow Mark done route through the same guard.)_
- [x] Job status: discourage `scheduled → done` skipping `in_progress` (no real work captured); consider requiring a tap-through (G-D3). _(done 2026-07-19: the primary already routes scheduled → Start; the overflow "Mark done" now folds a skip warning into the same markDone confirm — "Mark done without starting?" noting no work time was captured, merged with the $0/no-service notes so it's one dialog, never two stacked.)_
