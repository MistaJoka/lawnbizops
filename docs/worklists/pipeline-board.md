# Pipeline / Board / Schedule — worklist

Screens: [board](../../src/routes/_authed/board.tsx) ·
[pipeline](../../src/routes/_authed/pipeline.tsx) ·
[schedule](../../src/routes/_authed/schedule.tsx) ·
components: `src/features/board/PipelineBoard.tsx`, `CardQuickActions.tsx`,
`QuickAddJob.tsx`

Apply all four rubric lenses (README) to each item.

- [ ] Board: columns have consistent width/padding; headers use tokens; counts use `tabular-nums`.
- [ ] Board: cards have uniform padding/radius; status color from tokens (`text-go`/`text-alert`).
- [ ] Drag/move + CardQuickActions: writes via `enqueue()`; optimistic update reverts cleanly on failure.
- [ ] QuickAddJob: fields use `Field`; new job gets `crypto.randomUUID()`; submit disabled while pending.
- [ ] Empty column / empty board uses `EmptyState`; loading uses `Skeleton`.
- [ ] Schedule: date handling via `localToday()`; day/week headers align; today is clearly marked.
- [ ] Tap targets on cards and quick actions ≥44px.
- [ ] Edge padding `px-edge`; headings `heading-stencil`.

## Flow — lead→done (from e2e-audit-2026-06-24)

- [x] Pipeline card: add **"Quote"** (→ prefilled estimate) and **"Schedule"** actions carrying client context; stage change should be a side effect of doing work. _(done 2026-06-25: Quote on lead/quoted, Schedule on active; verified deep-links.)_
- [x] Pipeline empty state uses `EmptyState` with an "Add client" CTA. _(done 2026-06-25: full-screen EmptyState when no clients.)_
- [x] Today board: default scroll/landing to today's first **non-empty** lane (not the empty `quote` lane, `PipelineBoard.tsx` LANES[0]). _(done 2026-06-25: one-shot jump latches only once cards load; verified board opens on SCHEDULED.)_

## Stage criteria — from pipeline-stage-spec (2026-06-25)

- [x] **Soft advance gate**: when advancing a client stage whose exit criteria aren't met (e.g. → Active with no scheduled work, → Quoted with no estimate), warn + offer the producing action inline rather than silently allowing it (G-0 / G-H3). _(done 2026-07-19: `stageAdvanceWarning` (cache-first, count-query fallback, unknown→allow so offline never blocks) turns the board's advance confirm into "Move anyway" naming what's missing; detail-screen segmented control left ungated as the manual-override path.)_
- [x] **Auto-advance stage as a side effect**: estimate sent → `quoted`; payment received → `active` — so `clients.stage` reflects reality. _(done 2026-06-25: `maybeAdvanceStage` (forward-only, never auto-dormant) wired into `setEstimateStatus`(sent) + `recordPayment`; 8 unit tests. NOTE: demo can't show it live — fake backend re-serves seed stage on refetch, clobbering the optimistic patch; verified via unit tests instead.)_
