# Reference — Schedule

Route `/schedule?date=YYYY-MM-DD` · Tab 2 (calendar icon).

## TL;DR

A pageable week strip over a selected-day job list. Owns three jobs-through-time chores: browsing future weeks, catching **missed** jobs whose day slipped past, and the bulk rain-day move.

## ELI5

The fridge calendar. Seven day-tiles across the top, the chosen day's chores below, and a special drawer for chores that fell behind the fridge.

## Screen tour (top to bottom)

1. **Header** — "Schedule" + **+ Job** (opens New job carrying the selected date).
2. **Week pager** — **‹ / ›** shift a full week; a **Today** reset button appears only when you're off the current week.
3. **Day chips** — 7 tappable tiles; a dot marks days with work (the only capacity signal — count dots before overbooking).
4. **Missed — needs a new day (N)** — jobs still Scheduled after their date passed, alert-bordered, deep-linking to each job. Only this section surfaces them.
5. **Day list** — per row: client · start time · property · title · status chip · price (red **No price** flag when unpriced). Tap → job detail. A **bell** button on future scheduled jobs (when the client has a phone) opens a prefilled appointment-reminder text and logs the touch.
6. **Move all N to another day** — appears when the day has 2+ still-Scheduled jobs: date picker → **Move N**. In-progress/Done jobs stay put.

## States

- **Empty day:** "+ Add a job" empty state.
- **Offline:** browsing works from cache; moves queue.

## Used in SOPs

[SOP-04](../sops/sop-04-scheduling.md) · [SOP-05](../sops/sop-05-day-of-operations.md) · [SOP-06](../sops/sop-06-rain-day-recovery.md)

## Known gaps on this screen

[G-16](../../ops-manual-findings-2026-07-31.md#g-16) (no month view, no conflict/capacity detection) · [G-25](../../ops-manual-findings-2026-07-31.md#g-25) (skip-one-visit lives on the job, not the schedule)
