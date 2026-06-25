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
