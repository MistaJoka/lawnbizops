# Reference — Today

Route `/` · Tab 1 (Sun icon) · the daily work hub.

## TL;DR

Two views of one day behind a header toggle: **Board** (a six-lane pipeline kanban of everything in motion) and **Route** (today's stops in drive order). Above both: the app's only inbox (**Needs attention**) and, for new accounts, a getting-started checklist. Opening this screen also quietly extends the recurring-visit horizon.

## ELI5

The kitchen table where the whole business sits every morning: the mail pile (attention card), the fridge calendar (route), and the corkboard of everything in flight (board).

## Screen tour (top to bottom)

1. **Sync pill** (thin top bar) — see [offline-and-sync.md](offline-and-sync.md).
2. **Header** — "Today", an offline dot when disconnected, and the **Board | Route** toggle (choice persists per device).
3. **Day thesis line** — e.g. "6 stops · $905 booked · first at 8:00 AM".
4. **Needs attention (N)** card — up to 5 unseen events that happened _without_ you: new lead (sprout icon), repeat inquiry, customer approved/declined a quote. Rows deep-link to the client; **Got it** marks all seen (device-local, 14-day window). Overflow shows "+ N more on client timelines".
5. **Getting-started card** (new accounts) — 3-step checklist (add client → create quote → schedule job) with progress bar; **Hide** dismisses forever; auto-hides when complete.
6. **The active view** — Board or Route, below.

### Board view

- **Lane navigator** — 3×2 grid, one cell per lane with count + dollar total; tap to jump; highlights the lane in view.
- **Six lanes:** Quote → Scheduled (next 21 days only) → In progress → Done → Invoiced·unpaid → Paid. Opens on the first non-empty lane.
- **WIP caps** (advisory): Quote 10 · In progress 2 · Done 5 — the count badge tints red when over; nothing blocks.
- **Per-card actions by lane:**
  | Lane | Actions |
  |---|---|
  | Quote | Call · Text · Accept estimate |
  | Scheduled | **+ Job** quick-add row (clones a property's last job onto today; "Full form →" link) · per-card **Start**/⋯ · Call · Open in Maps |
  | In progress | **Done** / ⋯ (Mark done · Skip (rain / no-show) · Move to another day) |
  | Done | **Invoice →** (asks **Include all** / **Just this one** when the client has sibling done jobs) |
  | Invoiced·unpaid | **Record payment** · Call · **Friendly reminder** (prefilled SMS) · **Mark paid in full** (confirmed) |
  | Paid | Call |

### Route view

- **Open route in Maps (N stops)** — one multi-stop Google Maps link for the day.
- **Open map view** — jumps to Dispatch ([more-tools.md](more-tools.md)).
- **Low-stock banner** (when inventory alerts are on) → Inventory.
- **Follow-ups** — overdue + due-today tasks: done-checkbox, tap-through to client, Call/Text; **+ Add follow-up** inline (title + optional due date).
- **Stops** in nearest-neighbor order from your GPS position (or from the first pinned job when GPS is off): travel-mile dividers, gate-code chips, status chips, full job actions per stop.
- **Done today** — collapsed section of finished stops.
- **+ Add a job for today** — bottom of the list.

## States

- **Empty day:** Route shows an empty state with **+ Add job**.
- **Offline:** dot in header; everything works; writes queue (see [offline-and-sync.md](offline-and-sync.md)).
- **GPS denied/off:** route order falls back to first-pinned-job origin.

## Used in SOPs

[SOP-01](../sops/sop-01-lead-intake.md) (attention triage) · [SOP-05](../sops/sop-05-day-of-operations.md) (the whole day) · [SOP-07](../sops/sop-07-billing-day.md) (Done-lane invoicing) · [SOP-08](../sops/sop-08-collections.md) (A/R cards)

## Known gaps on this screen

[G-03](../../ops-manual-findings-2026-07-31.md#g-03) (this card is the only notification surface) · [G-08](../../ops-manual-findings-2026-07-31.md#g-08) (follow-up due dates fire nothing) · [G-15](../../ops-manual-findings-2026-07-31.md#g-15) (route order auto-only) · [G-18](../../ops-manual-findings-2026-07-31.md#g-18) (board quick-SMS skips the activity log) · [G-22](../../ops-manual-findings-2026-07-31.md#g-22) (no crew)
