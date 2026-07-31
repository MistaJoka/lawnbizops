# SOP-05 — Day-of operations

| Trigger       | Frequency | Screens                         | Time                          |
| ------------- | --------- | ------------------------------- | ----------------------------- |
| Every workday | Daily     | Today, Dispatch map, Job detail | Morning 5 min + at every stop |

## TL;DR

Morning: open **Today**, clear **Needs attention**, scan follow-ups, flip to **Route**, and drive the ordered list. At every stop: **Start** on arrival, **Done** on completion — those two taps are your timesheet, your labor cost, and your billing feed. The one rule: **statuses change at the curb, not from memory at the kitchen table.**

## ELI5

Today is a to-do list that sorts itself by driving distance. Each lawn has two buttons: "I'm starting" and "I'm finished." Press them when they're true — like punching a time clock — and tonight the app knows what to bill, what each job really took, and what's left over. Press them from memory at 9 PM and everything downstream is a guess.

## Before you start

- [ ] Yesterday ended clean (no stuck In-progress jobs).
- [ ] GPS tracking is on in More → App preferences if you want drive-order from your actual location.

## Steps

### Morning (5 minutes, non-negotiable)

1. Open **Today**. Work the **Needs attention (N)** card to zero (each row is a lead or a quote decision — SOP-01/SOP-02), then **Got it**.
   > **Gap [G-03]:** this card is the app's entire notification system. Skip the morning open and you're flying blind. → [findings](../../ops-manual-findings-2026-07-31.md#g-03)
2. Read the day-thesis line under the header ("6 stops · $905 booked · first at 8:00 AM") — does it match what you promised people?
3. Check **Follow-ups**: overdue and due-today tasks sit right there with call/text buttons.
   > **Gap [G-08]:** a due date never rings a bell anywhere else — this list is it. → [findings](../../ops-manual-findings-2026-07-31.md#g-08)
4. Flip the header toggle to **Route**.
   > **You should see:** stops in drive order with travel-mile dividers, gate-code chips, and a low-stock banner if supplies are short (SOP-10).
5. Tap **Open route in Maps (N stops)** for turn-by-turn of the whole day, or **Open map view** for the live dispatch map (pins, stop actions, per-stop **Navigate**).
   > **Gap [G-15]:** stop order is the app's suggestion (nearest-first from where you stand) — you can't drag it. Time-window and gate constraints are shown; deviate on judgment. → [findings](../../ops-manual-findings-2026-07-31.md#g-15)

### At every stop

6. Send **Text "on my way"** from the job screen before rolling — it logs the touch automatically.
   > Running behind instead? **Text "running late"** sits right below it — same one-tap-and-logged contract. _(Was gap [G-23]; fixed 2026-07-31.)_
7. On arrival, tap **Start**. This stamps your real start time — it feeds the labor cost on every profit number (set your $/hr in More → Business profile).
8. Work the job's checklist, snap photos, use the gate code shown on the job card.
9. On completion, tap **Done**. If a confirm appears — "never started", "no price — it will invoice at $0", "no service set" — **stop and fix the data, don't tap past it.** That confirm is the last quality gate before billing.
10. Field observations ("sprinkler head cracked, NE corner") go in the job's scope notes or checklist now, while you're looking at it.
    > **Gap [G-24]:** there's no note button on the job that reaches the client's timeline — client-level facts need a note added on the client page. → [findings](../../ops-manual-findings-2026-07-31.md#g-24)
11. Rain-out or no-show at one stop: **⋯ → Skip (rain / no-show)** (reopen it later with a new date) or **Move to another day**. Whole day lost → [SOP-06](sop-06-rain-day-recovery.md).

### Evening (2 minutes)

12. Flip Today back to **Board**: the In-progress lane must be empty; the Done lane is tomorrow's billing feed (or invoice at the curb — a Done card's **Invoice →**). Anything still Scheduled tonight will surface in Schedule's "Missed" section tomorrow — deal with it then (SOP-06 step 5).

> **Scaling note [G-22]:** everything here assumes one operator — jobs have no "assigned to". The day you hire, this SOP and the schema both need a crew seam. → [findings](../../ops-manual-findings-2026-07-31.md#g-22)

## Done when

- Every stop from the morning list is Done, Skipped, or Moved — none abandoned in Scheduled or In-progress.
- Start/Done were pressed at real times (your profit numbers depend on it).
- Needs attention and due follow-ups are cleared.

## What can go wrong

| Symptom                            | Cause                                | Fix                                                                               |
| ---------------------------------- | ------------------------------------ | --------------------------------------------------------------------------------- |
| Route view is empty but jobs exist | Properties unpinned, or GPS pref off | Dispatch's "Not on map" section lists them — add addresses; check App preferences |
| A stop is missing from the map     | Same — no geocode pin                | Tap it in "Not on map" → fix the property address                                 |
| No **Start** button on a job       | It's already past Scheduled          | Check the status chip; use ⋯ for Done/Skip/Move                                   |
| Tapped Done at $0 by accident      | Warned, but confirmed past it        | Fix the price on the invoice line at billing (SOP-07 step 3)                      |

## Related

[SOP-04](sop-04-scheduling.md) · [SOP-06](sop-06-rain-day-recovery.md) · [SOP-07](sop-07-billing-day.md) · [SOP-13](sop-13-offline-field-protocol.md) · [reference/today.md](../reference/today.md) · [reference/more-tools.md](../reference/more-tools.md)
