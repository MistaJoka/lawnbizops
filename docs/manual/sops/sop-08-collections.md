# SOP-08 — Collections

| Trigger                                   | Frequency              | Screens                          | Time    |
| ----------------------------------------- | ---------------------- | -------------------------------- | ------- |
| Money arrives; and a weekly overdue sweep | Daily as paid + weekly | Money → Invoices, Invoice detail | ~10 min |

## TL;DR

Record every payment the day it lands, chase the rest weekly with the aging chips and **Nudge overdue**, and let the nightly automation keep score. Corrections are **reversals**, never deletions. The one rule: **the app's balances match reality at the end of every day** — because the customer paid you outside the app, and only you can tell it.

> **Gap [G-01]:** customers cannot pay through the app. Every dollar arrives by Zelle, check, cash, or an outside card reader — and exists in your books only once you key it in. This entire SOP exists because of that gap. → [findings](../../ops-manual-findings-2026-07-31.md#g-01)

## ELI5

You're the bank teller for your own business. Money shows up in different pockets — the app can't see any of them, so every evening you tell it what came in. And once a week you look at the "who still owes me" list, oldest first, and send friendly pokes. Old bills don't age like wine.

## Before you start

- [ ] The payment actually cleared (don't record a promised check).
- [ ] Automations reviewed once (More → Automations): overdue reminder tasks/emails on if you want the robot's help.

## Steps

### Recording money (daily)

1. Open the invoice → **Record payment**.
   > **You should see:** a sheet with the amount prefilled to the balance, method (Cash / Check / Zelle / Card (external) / Other — remembers your last), date = today, note.
2. Adjust if partial and save. A partial payment sets the invoice to Partially paid; the ledger shows every payment.
3. Board shortcut for the curb: an A/R card's **Record payment** link, or **Mark paid in full** (confirm) — the latter records method "other", so prefer the invoice screen when you care about income-by-method in reports.
4. **Typo or bounced check?** Tap **Reverse** on that payment row — it posts an offsetting negative entry. Nothing is ever deleted; the ledger is append-only.
5. Overpayment is blocked ("That's more than the … balance due").
   > **Gap [G-12]:** there's no credit balance or prepayment concept — record up to the balance and settle the remainder outside the app or as a negative line on the next invoice. → [findings](../../ops-manual-findings-2026-07-31.md#g-12)

### Chasing money (weekly)

6. **Money → Invoices**: read the aging chips (Current / 1–30 / 31–60 / 61–90 / 90+). Everything right of Current is your call list.
7. Tap **Nudge overdue (N)**.
   > **You should see:** a sheet with one row per overdue invoice and a **Nudge** button that opens a prefilled, friendly text — and stamps the reminder date and logs an activity, so rows show "nudged N days ago."
   > The board's **Friendly reminder** quick action logs the touch too _(was gap [G-18]; fixed 2026-07-31)_ — nudge from wherever you are; every path leaves the paper trail now.
8. Know what the robot already did: the nightly sweep (7:15 AM) creates a follow-up task per newly-overdue invoice and — if enabled — emails the customer a reminder (re-nudges capped at weekly).
   > **Gap [G-03]:** payments themselves notify nobody, and no automation can see your Zelle. Recording (steps 1–2) is forever manual. → [findings](../../ops-manual-findings-2026-07-31.md#g-03)
9. Escalation past 60 days: call, don't text. Log the call as a note on the client so the timeline holds your history ([G-24](../../ops-manual-findings-2026-07-31.md#g-24)).

### Fixing a bad invoice

10. **Void invoice** (bottom of the invoice) — it warns you, reverses any recorded payments, and returns the jobs to Done so they can be re-invoiced correctly on the next billing day.

## Done when

- Every payment received is recorded, dated the day it landed, with the real method.
- No overdue invoice has gone unnudged for more than 7 days.
- Any correction shows as a reversal pair, not a mystery.

## What can go wrong

| Symptom                                    | Cause                                                                         | Fix                                                                        |
| ------------------------------------------ | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Payment won't save                         | Amount exceeds balance ([G-12](../../ops-manual-findings-2026-07-31.md#g-12)) | Record ≤ balance; handle the excess outside or as next-invoice credit line |
| **Reverse** missing on a row               | Already reversed (double-reversal guard)                                      | Nothing to do — check the offsetting line below it                         |
| Nudge opens an empty text                  | Client has no phone                                                           | Add one, or use the invoice's **Send reminder** / **Email invoice**        |
| Customer disputes the total                | —                                                                             | Read them the payment ledger; it's append-only and tells the whole story   |
| Client wants one statement across invoices | No statement feature ([G-12](../../ops-manual-findings-2026-07-31.md#g-12))   | Their page's Open balance + Money list, or export CSV                      |

## Related

[SOP-07](sop-07-billing-day.md) · [SOP-11](sop-11-weekly-review.md) · [reference/money.md](../reference/money.md)
