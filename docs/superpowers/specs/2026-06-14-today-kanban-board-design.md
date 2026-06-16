# Today Kanban Board — Design Spec

**Date:** 2026-06-14
**Status:** Approved (pre-implementation)
**Author:** brainstorming session

## Problem & intent

The Today tab is currently a drive-order job timeline. The user wants Today to be
a **Kanban board where you can create new elements**, **tactical and frictionless**
for one-handed, gloved field use on an Android phone. Research and a mock-data
walkthrough refined the request into the design below.

Two supporting decisions, already made:

- **Drag-and-drop is rejected** as the move primitive. 2026 research: Atlassian
  Pragmatic DnD is weak on touch (drops land ~10% of the time, sluggish
  press-hold); @dnd-kit fights vertical scroll and needs a long press. The
  existing `/board` already proves **tap-to-advance** works one-thumb. We ship
  tap-to-advance now, DnD later if ever.
- A coherent local **seed** (`supabase/seed.sql`, "Apex Lawn & Landscape") was
  built to pressure-test cohesion. It surfaced that the app already has **two**
  board-like views on different axes, which shaped the lane design (below).

## Cohesion findings that shaped this design

From walking the app against the seed:

1. **Two existing board axes, not one.** `/pipeline` is a **client-relationship**
   kanban (Lead → Quoted → Active → Dormant). `/board` is a **work/money**
   kanban (Quote → To-do → In progress → Done) that **stops at Done** — no A/R
   or Paid lane. The Today board is the **work/money** axis, extended through
   cash. It therefore has **no Lead lane** (leads live in `/pipeline`) and it
   **replaces** `/board`.
2. The whole money loop is already wired and verified end-to-end: estimate
   Accept → Create Job / Convert to Invoice; job Start → Done; Done → Create
   Invoice; invoice Record Payment / Friendly Reminder / PDF. The board is a new
   **view over existing flows**, not new data plumbing — low risk.

(Out of scope, tracked separately: `current_org()` non-determinism for
multi-org users; stale-JWT empty-session guard.)

## Design

### 1. Today becomes a work hub with a Board ⇄ Route toggle

- Header **segmented toggle**, choice persisted in `preferences` (default **Board**).
- **Route** = the existing drive-order list (nearest-neighbor + "Open route in
  Maps"), unchanged except it adopts the new shared card-action model. The
  current `TodayScreen` body is extracted into a `RouteView` component.
- **Board** = the pipeline below.
- `/board` route redirects to `/`; the Settings/header links that pointed at
  `/board` are updated. `/pipeline` is untouched.
- The Board is **not** today-scoped — it shows all open work across dates,
  because a pipeline's job is to show flow. Route stays today-scoped.

### 2. The pipeline — 5 lanes + a terminal Paid state

Horizontal snap-scroll columns (same pattern as today's `/board`). Each lane is
a workflow state with an entry gate (definition-of-ready), an exit action
(definition-of-done), and an advisory WIP signal.

| Lane               | Backed by                           | Entry: card appears when…                                 | Exit: primary tap                                           | WIP signal                  |
| ------------------ | ----------------------------------- | --------------------------------------------------------- | ----------------------------------------------------------- | --------------------------- |
| **Quote**          | estimates `draft`/`sent`            | a quote is drafted/sent                                   | card → estimate detail (Accept → Create Job, existing flow) | soft ~10                    |
| **Scheduled**      | jobs `scheduled`                    | job has a date (accepted quote, recurrence, or quick-add) | **Start** → `in_progress`                                   | none (backlog)              |
| **In progress**    | jobs `in_progress`                  | tapped Start (on-site)                                    | **Done** → `done`                                           | **hard 1–2** (Little's Law) |
| **Done**           | jobs `done` (unbilled)              | work finished, not invoiced                               | **Invoice** → create/link invoice                           | ~5 (unconverted revenue)    |
| **Invoiced · A/R** | open invoices (`balance_cents > 0`) | invoice issued                                            | **Record payment** → Paid                                   | aging-tinted amber→red      |
| → **Paid**         | invoices `paid`                     | balance hits 0                                            | terminal — shown as "Paid this week ×N", off-board          | —                           |

- WIP signals are **color cues on the lane's count badge** (amber/red past the
  cap), **never a hard block**.
- The A/R lane tints cards by invoice age, reusing the existing aging-bucket
  logic — this is the collections lane (the user's #1 pain).

### 3. Tap-to-advance: one primary + overflow per card

Refactor `JobActions` (currently DONE / SKIP / MOVE, three competing buttons)
into **one full-width, glove-sized primary** = the expected next step, plus a
small **⋯** overflow. Shared by **both** Route and Board.

- **Quote** card: tap body → estimate detail (the Accept→Create-Job flow is
  richer than a single tap and already good). No primary button needed.
- **Scheduled**: primary **Start** → `in_progress`; overflow: Skip, Move/Reschedule, Open.
- **In progress**: primary **Done** → `done`; overflow: Skip, Open.
- **Done**: primary **Invoice** → create/link invoice (existing Create-Invoice
  flow); overflow: Open.
- **Invoiced · A/R**: primary **Record payment** → `apply_payment`; overflow:
  Friendly reminder, Open.

All advance actions reuse existing mutations and go through the outbox
(optimistic). No new write paths.

### 4. Frictionless quick-create: inline add-to-column

- A pinned **`+ Job`** row at the top of the **Scheduled** lane. Tap → it
  **expands in place** into a one-line client/property picker (search,
  **recents first**) — no navigation, no full sheet on Board.
- Pick a property → a job is created **scheduled today**, prefilled with that
  property's **default service + price** (from `property_services` override, else
  the service default), and appears in the Scheduled lane immediately
  (optimistic via `enqueue`, client-generated UUID).
- A small **"More…"** affordance opens the full `/jobs/new` form for the rare
  detailed case.
- The FAB the user selected **stops navigating to `/jobs/new`**: on **Route** it
  opens the same quick-add as a compact bottom sheet (Route has no columns); on
  **Board** it focuses the inline Scheduled add-row.
- Shared `<QuickAddJob>` component backs both the inline row and the Route sheet.

### 5. Frictionless principles (apply throughout)

- Tap targets ≥56px; the 90% path is one thumb-tap.
- No full-page detour on common actions — sheets/inline only.
- Prefill from property defaults; recents-first picker; minimal typing.
- Every write goes through `enqueue()` (iron rule); optimistic `setQueryData`.

## Components & boundaries

- **`src/features/board/hooks.ts`** — `usePipelineBoard()` composes
  `useKanbanJobs` + `useEstimates` + `useInvoiceBalances` into lane buckets;
  exports column config + WIP thresholds + the "paid this week" count. Pure
  bucketing/threshold helpers are unit-tested.
- **`src/features/board/PipelineBoard.tsx`** — lanes, cards, primary+overflow
  wiring. Consumes `usePipelineBoard()` and the shared card actions.
- **`src/features/board/QuickAddJob.tsx`** — inline add-row + Route sheet;
  property-default prefill; calls existing `createOneOffJob`.
- **`src/features/jobs/JobActions.tsx`** — refactor to primary + `⋯` overflow;
  reused by Route cards and Board cards.
- **`src/routes/_authed/index.tsx`** — Board⇄Route toggle, extract `RouteView`,
  persist toggle in `preferences`, FAB → quick-add.
- **`src/routes/_authed/board.tsx`** — redirect to `/`.

Each unit has one purpose and a clear interface: `usePipelineBoard` owns data
shaping (testable without UI), `PipelineBoard` owns layout, `QuickAddJob` owns
creation, `JobActions` owns per-card advancement.

## Data & invariants

- No schema changes. Lanes are derived from existing `status`/`balance` values.
- Money stays integer cents; dates stay device-local date-only strings.
- New job rows: client-generated `crypto.randomUUID()`, no `user_id`/timestamps
  in the payload (DB owns them); `org_id` stamped by the DB default.

## Error handling

- Reads are TanStack Query; lanes render from cache, graceful when offline.
- Advances and quick-add are optimistic through the outbox; a failed op surfaces
  in the existing sync-issues UI, never blocks the board.
- WIP caps never block; they only tint.

## Testing & verification

- Unit: lane bucketing (each entity → correct lane), WIP threshold coloring,
  quick-add prefill resolution (property override vs service default).
- `npx prettier --write . && npm run lint && npm test && npm run build`.
- Preview walkthrough against the local seed (`supabase/seed.sql`), which
  populates every lane: prove Start → In progress → Done → Invoice → Paid, and
  inline quick-add, end to end with no console errors.
