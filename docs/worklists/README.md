# App-wide /loop worklists

A backlog for running `/loop` across every screen of the app. One file per
feature area; each file is a checklist `/loop` walks top-to-bottom, one item per
iteration. This README defines **how the loop runs** (the iteration protocol)
and **what "good" means** (the rubric every item is judged against).

## How to run a pass

Pick an area file and run (self-paced — no interval, the model decides when to
come back):

```
/loop Work docs/worklists/clients.md per the protocol in docs/worklists/README.md. One item per iteration.
```

Swap `clients.md` for any area file. Run one area at a time so diffs stay small
and reviewable on-device.

## Iteration protocol

Each iteration does exactly one thing:

1. Read the area file. Pick the **first unchecked `[ ]`** item.
2. Open the relevant screen/component source. **Verify the issue is real.** If
   it's already correct, check it off as `[x] (already correct)` and stop.
3. Make the **smallest** change that resolves it. Obey the iron rules below.
4. Run the full gate:
   `npx prettier --write . && npm run lint && npm test && npm run build`
5. **Only if green:** check the item off, commit, and push to main (the
   on-device test path). If red, fix or revert — never push red.
6. Stop. One item per iteration keeps diffs small and reviewable.

When every item in the file is checked, report the area complete and end the loop.

## Iron rules (never violate, even mid-polish)

- **Every write goes through `enqueue()`** (`src/lib/outbox.ts`). Never call
  `supabase.from(...).insert/update/delete` from UI code.
- **No `user_id` / `created_at` / `updated_at`** in upsert payloads — DB owns those.
- **Money is integer cents**; format only at the edge via `src/lib/format.ts`.
- **Dates are date-only strings** from `localToday()`, never UTC midnight.
- New rows get `crypto.randomUUID()` ids (idempotent upserts).

## The rubric — apply all four lenses to every screen

Each item below names a concrete, checkable standard. When auditing a screen,
sweep all four.

### 1. Visual polish

- Page edge padding uses the **`px-edge`** token (not ad-hoc `px-4`).
- Section/page headings use **`heading-stencil`**.
- Colors come from tokens — `bg-canvas` / `bg-panel`, `border-edge`,
  `text-sand` / `text-faded` / `text-khaki`, `bg-blaze` (CTA), `text-go` /
  `text-alert`. No hardcoded hex or `gray-*`.
- Numbers (money, dates, counts) use **lining/tabular figures**
  (`tabular-nums`) and right-align in columns where compared.
- Consistent card/panel padding, border radius, and vertical rhythm. Labels and
  values align into clean columns.

### 2. UX / consistency

- Empty lists render the **`EmptyState`** component, with a useful CTA.
- Loading renders **`Skeleton`**, not a bare spinner or layout shift.
- Errors render **`QueryError`** (queries) / **`AppErrorFallback`** (boundaries).
- Status is shown via **`StatusChip`** (or the entity-specific chip).
- Destructive actions go through **`ConfirmDialog`**.
- Primary CTA is **`bg-blaze`**; secondary actions are visually subordinate.
- Headers, back navigation, and the `Fab`/`TabBar` behave consistently.

### 3. Correctness / bugs

- All writes via `enqueue()`; optimistic `setQueryData` shape matches the server
  row and the right query key (`['clients']`, `['clients', id]`, …).
- Money handled as cents end-to-end; formatted only via `src/lib/format.ts`.
- Dates via `localToday()`; no `new Date().toISOString()` for date-only fields.
- No stale-closure bugs in handlers; no missing `id` on new rows.
- Forms: validation, disabled-while-pending, and error surfacing all present.

### 4. Accessibility / performance

- Tap targets are glove-friendly (min ~44px). Inputs use the **`Field`** wrapper
  with a real `<label>`.
- Text on `text-faded` / `text-khaki` meets contrast over its background.
- Long lists are paginated/windowed; heavy renders are memoized.
- PDF generation and image work are lazy-loaded, not in the critical path.

## Adding work

Refill an area file anytime — append `[ ]` items. When you spot something
out-of-area mid-pass, add it to the right area file rather than fixing it inline
(keeps the current diff small).
