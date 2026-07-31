# SOP-03 — Winning the work

| Trigger                                      | Frequency | Screens                        | Time   |
| -------------------------------------------- | --------- | ------------------------------ | ------ |
| An estimate is accepted (online or verbally) | Per win   | Estimate detail, Client detail | ~5 min |

## TL;DR

Record the acceptance, optionally take a deposit, and turn the estimate into scheduled work — a one-off job or a recurring schedule — straight from the estimate page. Scheduling the work carries the service over and advances the client to **Active** by itself; your job is a ten-second verify at the end. The one rule: **a "yes" isn't won until it's on the calendar.**

## ELI5

The customer said yes. A yes is air until it becomes a date on the calendar and, ideally, some money down. This SOP turns air into a calendar entry — the robot handles the bookkeeping (service, stage) the moment the calendar entry exists.

## Before you start

- [ ] Estimate status is **Sent** (or the customer approved at their link — then it's already **Accepted**).
- [ ] The client's property is on file. **If not, add it before anything else** — see step 3's gap box.

## Steps

1. **Record the acceptance.** If the customer approved online, the estimate already shows Accepted (you saw it on the Needs attention card). For a verbal yes: open the estimate → tap **Accepted**.
2. **Deposit (optional but wise on big jobs):** in the deposit card, tap **25%** / **50%** or type an amount → it creates a deposit invoice. Send and collect it per SOP-07/SOP-08; it is automatically deducted later when you convert the estimate to the final invoice.
3. **Schedule the work — pick one:**
   - **One-off:** in the job card, pick a date → **Create job**. Price, scope, and — when the first line came from your service catalog — the Service all carry from the estimate.
   - **Recurring:** tap **Create recurring schedule** — property and price carry over; pick cadence and first visit (SOP-04 covers the form).
     > **You should see:** on a property-less estimate both buttons sit disabled with "Needs a property — estimate has none." and an inline **+ Add property** link — use it, then come back. _(Was gap [G-06]; fixed 2026-07-31.)_
4. **Verify the Service.** Open the new job — a catalog-worded estimate line carried its service automatically _(was gap [G-05]; fixed 2026-07-31)_. A custom-worded line can't be matched: if the service is blank, **Edit** → set **Service** so revenue tracks by service.
5. **Verify the stage.** Scheduling the work advanced the client to **Active** by itself _(was gap [G-07]; fixed 2026-07-31)_. A verbal "yes" you never scheduled stays **Quoted** — which is the truth, and exactly why this SOP ends on the calendar, not the handshake.
6. The final invoice happens later, on billing day: **Convert to invoice** on this estimate deducts the deposit automatically (SOP-07 path D).

## Done when

- Estimate chip reads **Accepted**.
- A job (with a Service set) or a recurring schedule exists for it.
- The client's stage reads **Active**.
- If a deposit was taken, its invoice is sent.

## What can go wrong

| Symptom                                     | Cause                                                            | Fix                                                                                        |
| ------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| **Create job** disabled                     | No property on the estimate                                      | Tap the inline **+ Add property**, then retry                                              |
| **Create recurring schedule** disabled      | No property on the estimate                                      | Tap the inline **+ Add property**, then retry                                              |
| **Convert to invoice** disabled             | An invoice is already linked (double-billing guard)              | Open it from Money — the link is one-to-one by design                                      |
| Job warns "no service set" at Done          | The estimate's first line was custom-worded, so no catalog match | Edit the job and set the Service before marking done                                       |
| Won client still shows "Quoted" weeks later | Accepted verbally but never scheduled                            | Schedule the work (that advances the stage), or advance manually if the work lives off-app |

## Related

[SOP-02](sop-02-estimate-and-delivery.md) · [SOP-04](sop-04-scheduling.md) · [SOP-07](sop-07-billing-day.md) · [reference/money.md](../reference/money.md)
