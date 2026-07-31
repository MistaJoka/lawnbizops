# LawnBizOps Operations Manual

The complete manual and SOP set for running a lawn-care business on LawnBizOps. Written from current source (`main` @ `22901d2`), not from the older audit docs.

**Two kinds of documents live here:**

- **SOPs** (`sops/`) — numbered, repeatable procedures. They own the _how_: what to tap, in what order, and how to know you're done.
- **Reference** (`reference/`) — one file per app area. They own the _what_: every screen, control, field, and state — including features no SOP exercises.

A third document lives beside this directory: [`docs/ops-manual-findings-2026-07-31.md`](../ops-manual-findings-2026-07-31.md) — the dated register of gaps and improvement opportunities discovered while writing this manual. The manual is evergreen; the findings report is a point-in-time snapshot, superseded by future dated reports.

## The one iron law

**Nothing in the app hard-blocks.** Every guardrail is a soft warning with a "Move anyway" / "Mark done" escape hatch. The app will let you quote a client with no contact info, finish a job with no price, and advance a stage with nothing behind it. **These SOPs are the enforcement mechanism.** When an SOP says "do not skip this step," that is the only thing standing between you and bad data.

## Operating cadence

| When                       | Do                                                          | SOP                                                 |
| -------------------------- | ----------------------------------------------------------- | --------------------------------------------------- |
| Every morning              | Open Today, clear **Needs attention**, walk the route       | [SOP-05](sops/sop-05-day-of-operations.md)          |
| A lead arrives             | Triage and respond same-day                                 | [SOP-01](sops/sop-01-lead-intake.md)                |
| Quoting work               | Create, send, and chase the estimate                        | [SOP-02](sops/sop-02-estimate-and-delivery.md)      |
| A quote is accepted        | Convert to job / schedule / deposit — and advance the stage | [SOP-03](sops/sop-03-winning-the-work.md)           |
| Booking work               | One-off jobs and recurring schedules                        | [SOP-04](sops/sop-04-scheduling.md)                 |
| Rain or a lost day         | Bulk-move the day, tell the clients                         | [SOP-06](sops/sop-06-rain-day-recovery.md)          |
| End of week                | Billing day — invoice all done work                         | [SOP-07](sops/sop-07-billing-day.md)                |
| End of week                | Weekly review — dashboard, P&L, pipeline                    | [SOP-11](sops/sop-11-weekly-review.md)              |
| Money comes in / gets late | Record payments, chase overdue                              | [SOP-08](sops/sop-08-collections.md)                |
| Monthly                    | Pipeline hygiene — stages, follow-ups, dormant pass         | [SOP-09](sops/sop-09-client-lifecycle.md)           |
| As they happen             | Expenses, inventory counts, mileage                         | [SOP-10](sops/sop-10-expenses-inventory-mileage.md) |
| Quarterly / January        | Tax center, Schedule C, 1099s                               | [SOP-12](sops/sop-12-tax-season.md)                 |
| Whenever signal drops      | The offline protocol                                        | [SOP-13](sops/sop-13-offline-field-protocol.md)     |

## Document map

**SOPs:** [01 Lead intake](sops/sop-01-lead-intake.md) · [02 Estimate & delivery](sops/sop-02-estimate-and-delivery.md) · [03 Winning the work](sops/sop-03-winning-the-work.md) · [04 Scheduling](sops/sop-04-scheduling.md) · [05 Day-of operations](sops/sop-05-day-of-operations.md) · [06 Rain-day recovery](sops/sop-06-rain-day-recovery.md) · [07 Billing day](sops/sop-07-billing-day.md) · [08 Collections](sops/sop-08-collections.md) · [09 Client lifecycle](sops/sop-09-client-lifecycle.md) · [10 Expenses, inventory & mileage](sops/sop-10-expenses-inventory-mileage.md) · [11 Weekly review](sops/sop-11-weekly-review.md) · [12 Tax season](sops/sop-12-tax-season.md) · [13 Offline field protocol](sops/sop-13-offline-field-protocol.md)

**Reference:** [Today](reference/today.md) · [Schedule](reference/schedule.md) · [Quick create](reference/quick-create.md) · [Clients](reference/clients.md) · [Money](reference/money.md) · [More: work tools](reference/more-tools.md) · [Settings](reference/settings.md) · [Public pages](reference/public-pages.md) · [Offline & sync](reference/offline-and-sync.md)

## Conventions

- **SOPs never re-describe screens.** A step says what to tap and links to the reference file for anything more.
- **Reference files never contain procedures.** Each section ends with "Used in: SOP-nn". A feature no SOP touches is marked `(no SOP — utility feature)` — that marker set is the proof this manual covers full functionality.
- **`> **You should see:**`** blockquotes are screenshots-in-words. Every quoted button or label matches the app verbatim.
- **`> **Gap [G-nn]:**`** blockquotes flag a known limitation at the exact step you hit it — workaround first, then a link to the [findings report](../ops-manual-findings-2026-07-31.md). Gap IDs are stable and never reused.

## SOP template

```markdown
# SOP-nn — Title

| Trigger | Frequency | Screens | Time |
| ------- | --------- | ------- | ---- |

## TL;DR 2–4 sentences + the one rule that matters

## ELI5 Plain language, no app vocabulary

## Before you start Checklist: prerequisite state, connectivity notes

## Steps Numbered; each step names the exact button/label

## Done when A verifiable end state

## What can go wrong Symptom | Cause | Fix table

## Related SOPs + reference links
```

## Reference template

```markdown
# Area name

## TL;DR

## ELI5

## Screen tour (top to bottom) Numbered walk of every element in visual order

## Controls & fields Tables

## States Empty / offline / error

## Used in SOPs

## Known gaps on this screen G-nn list
```

## Maintenance

- When the app changes, update the manual in the same PR. A doc that describes a button that no longer exists is a bug.
- New gaps discovered later get the next free G-nn in a **new dated findings report**; never renumber old ones.
