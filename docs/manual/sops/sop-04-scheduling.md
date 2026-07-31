# SOP-04 — Scheduling

| Trigger                             | Frequency | Screens                              | Time               |
| ----------------------------------- | --------- | ------------------------------------ | ------------------ |
| Work needs a date — once or forever | Ongoing   | New → Job, Schedule, Property detail | ~2 min per booking |

## TL;DR

One-off work goes in through **New → Job** (let the **Best day** helper pick a date near your existing route); repeat work becomes a **recurring schedule** on the property, and the app materializes its future visits by itself. The one rule: **every job has a pinned property and a price before its day arrives** — an unpinned job can't route, an unpriced job invoices at $0.

## ELI5

Two kinds of promises: "I'll come Tuesday" (a sticky note on one date) and "I'll come every other Tuesday" (a rubber stamp that prints sticky notes forever). This SOP is how to place the note, set up the stamp, and pause the stamp for the winter — without the calendar turning into fiction.

## Before you start

- [ ] Client and property exist, and the property's address was picked from the autofill suggestions (that's what pins it to the map).
- [ ] The service has a price — catalog default (More → Service catalog) or a per-property override (property page → Service prices).

## Steps

### A — One-off job

1. Tab bar → **New → Job** (or **+ Job** on Schedule — it carries that date; or **Schedule work** on an Active client).
2. Pick Client → Property (auto-selected when they have exactly one) → **Service** — picking it prefills the price, using the property's override if one exists.
3. Pick the date. Glance at the **Best day** strip: the next 7 days each show how close your nearest existing stop is — booking near existing work is free money.
   > **Gap [G-16]:** nothing warns you a day is overbooked; the only capacity signal is the job-count dots on Schedule's day chips. Count before you book. → [findings](../../ops-manual-findings-2026-07-31.md#g-16)
4. Add a start time if promised, scope/materials notes, then **Create job**.
   > **You should see:** the Schedule screen for that date, your new job in the list — with its price. A red "No price" flag means go back and fix it now.

### B — Recurring schedule

5. Open the property → **+ Add schedule** (or **Create recurring schedule** on an accepted estimate — it carries price and property; or the "Set up recurring visits" option right after creating a property).
6. Fill the form: cadence (Every week / Every 2 weeks / Every 4 weeks / Monthly on a set day), first visit date, service, price, optional end date.
   > **You should see:** a live "Next visits:" preview of the first 4 dates — sanity-check it against what you promised the customer.
7. Save. Future visits **materialize themselves** as jobs (the horizon extends each time you open the app; the board shows ~3 weeks ahead, Schedule shows the rest week by week).

### C — Changing what's booked

8. **One visit only** ("skip next week, we're away"): open that materialized job → **⋯ → Move to another day** or **Skip (rain / no-show)**. Hand-moved visits are marked as customized — a schedule resync won't snap them back.
   > **Gap [G-25]:** there is no "skip next visit" button on the schedule itself — the materialized-job route above IS the procedure. → [findings](../../ops-manual-findings-2026-07-31.md#g-25)
9. **Seasonal hold:** schedule → edit → **Pause**, optionally with an auto-resume date (the nightly sweep lifts the hold for you). **Resume schedule** brings it back manually.
10. **Ending it:** set an end date, or delete the schedule.
    > **Gap [G-19]:** deleting a schedule requires connectivity — offline it fails with a toast. Offline, Pause instead and delete later. → [findings](../../ops-manual-findings-2026-07-31.md#g-19)
    > **Gap [G-13]:** the property page has no job history or booking CTAs, so do your booking from the client page and your schedule management from the property page — that's the grain of the app. → [findings](../../ops-manual-findings-2026-07-31.md#g-13)

## Done when

- The new work shows on Schedule with a price (no red flags) and, for recurring, the "Next visits" preview matched the promise.
- The property shows a map pin (no "no pin" badge) — it will appear on Dispatch when its day comes.

## What can go wrong

| Symptom                                             | Cause                                                          | Fix                                                           |
| --------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------- |
| Job missing from Dispatch on its day                | Property never geocoded ("no pin")                             | Edit the property, pick the address from autofill suggestions |
| Row shows red **No price**                          | Job created without service/price                              | Edit the job; set service or price                            |
| Recurring visits stop appearing months out          | Horizon extends on app-open; long absence = short horizon      | Open the app; visits materialize on load                      |
| Moved visit snapped back after editing the schedule | Only hand-customized jobs survive resync                       | Re-move it; it's now customized and will stick                |
| Delete schedule fails                               | Offline ([G-19](../../ops-manual-findings-2026-07-31.md#g-19)) | Pause now, delete on wifi                                     |

## Related

[SOP-03](sop-03-winning-the-work.md) · [SOP-05](sop-05-day-of-operations.md) · [SOP-06](sop-06-rain-day-recovery.md) · [reference/schedule.md](../reference/schedule.md) · [reference/clients.md](../reference/clients.md)
