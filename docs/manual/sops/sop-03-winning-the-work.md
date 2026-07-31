# SOP-03 — Winning the work

| Trigger                                      | Frequency | Screens                        | Time   |
| -------------------------------------------- | --------- | ------------------------------ | ------ |
| An estimate is accepted (online or verbally) | Per win   | Estimate detail, Client detail | ~5 min |

## TL;DR

Record the acceptance, optionally take a deposit, and turn the estimate into scheduled work — a one-off job or a recurring schedule — straight from the estimate page. Then two things the app will NOT do for you: **set the Service on the new job** and **advance the client to Active**. The one rule: **a "yes" isn't won until it's on the calendar.**

## ELI5

The customer said yes. A yes is air until it becomes a date on the calendar and, ideally, some money down. This SOP turns air into a calendar entry — and fixes two small things the robot forgets so your reports stay honest.

## Before you start

- [ ] Estimate status is **Sent** (or the customer approved at their link — then it's already **Accepted**).
- [ ] The client's property is on file. **If not, add it before anything else** — see step 3's gap box.

## Steps

1. **Record the acceptance.** If the customer approved online, the estimate already shows Accepted (you saw it on the Needs attention card). For a verbal yes: open the estimate → tap **Accepted**.
2. **Deposit (optional but wise on big jobs):** in the deposit card, tap **25%** / **50%** or type an amount → it creates a deposit invoice. Send and collect it per SOP-07/SOP-08; it is automatically deducted later when you convert the estimate to the final invoice.
3. **Schedule the work — pick one:**
   - **One-off:** in the job card, pick a date → **Create job**. Price and scope carry from the estimate.
   - **Recurring:** tap **Create recurring schedule** — property and price carry over; pick cadence and first visit (SOP-04 covers the form).
     > **You should see:** on a property-less estimate the job button is disabled with an inline **+ Add property** link — use it, then come back.
     > **Gap [G-06]:** with no property, **Create recurring schedule doesn't appear at all** — no hint it exists. Add the property first, reopen the estimate, and the button shows up. → [findings](../../ops-manual-findings-2026-07-31.md#g-06)
4. **Mandatory — set the Service.** Open the job you just created → **Edit** → set **Service** → save.
   > **Gap [G-05]:** jobs created from estimates always arrive with no service. Skip this and the job trips a "no service set" warning at Done and its revenue vanishes from any by-service view. → [findings](../../ops-manual-findings-2026-07-31.md#g-05)
5. **Mandatory — advance the stage.** Open the client → tap **Active** on the stage control (or **Advance →** on their Pipeline card).
   > **Gap [G-07]:** winning work advances nothing by itself — only a recorded payment does. Without this tap, a working client reads "Quoted" on every board and count until their first payment. → [findings](../../ops-manual-findings-2026-07-31.md#g-07)
6. The final invoice happens later, on billing day: **Convert to invoice** on this estimate deducts the deposit automatically (SOP-07 path D).

## Done when

- Estimate chip reads **Accepted**.
- A job (with a Service set) or a recurring schedule exists for it.
- The client's stage reads **Active**.
- If a deposit was taken, its invoice is sent.

## What can go wrong

| Symptom                                         | Cause                                                                            | Fix                                                        |
| ----------------------------------------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| **Create job** disabled                         | No property on the estimate                                                      | Tap the inline **+ Add property**, then retry              |
| **Create recurring schedule** nowhere on screen | Same cause, worse symptom ([G-06](../../ops-manual-findings-2026-07-31.md#g-06)) | Add the property from the client page, reopen the estimate |
| **Convert to invoice** disabled                 | An invoice is already linked (double-billing guard)                              | Open it from Money — the link is one-to-one by design      |
| Job warns "no service set" at Done              | Step 4 skipped ([G-05](../../ops-manual-findings-2026-07-31.md#g-05))            | Edit the job and set the Service before marking done       |
| Won client still shows "Quoted" weeks later     | Step 5 skipped ([G-07](../../ops-manual-findings-2026-07-31.md#g-07))            | Advance them now; recheck during SOP-09                    |

## Related

[SOP-02](sop-02-estimate-and-delivery.md) · [SOP-04](sop-04-scheduling.md) · [SOP-07](sop-07-billing-day.md) · [reference/money.md](../reference/money.md)
