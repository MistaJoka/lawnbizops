# SOP-01 — Lead intake

| Trigger                                            | Frequency                     | Screens        | Time            |
| -------------------------------------------------- | ----------------------------- | -------------- | --------------- |
| Any new inquiry: public form, call, text, referral | As it happens + every morning | Today, Clients | ~5 min per lead |

## TL;DR

Every inquiry becomes a client record with stage **Lead** the same day it arrives, with at least one contact channel and — when known — the service address. Public-form leads create themselves; everything else you enter by hand. The one rule: **no lead lives outside the app** — not in your head, not in a text thread, not on a napkin.

## ELI5

Think of a fish trap and a bucket. The public quote link is the trap — it catches customers while you're on a mower. The Clients list is the bucket — everything you catch goes in it, tagged "lead" so you know it still needs landing. A fish you don't put in the bucket is a fish you never had.

## Before you start

- [ ] One-time: your public quote link is shared somewhere customers see it (step 1).
- [ ] The morning **Needs attention** check (SOP-05 step 1) is part of your daily routine — that's where automatic leads surface.

## Steps

### A — Set the trap (one-time)

1. Go to **More → Business profile**, scroll to **Quote request link**, and tap **Share link**.
   > **You should see:** a public URL ending in `/quote/…`. Put it in your Google Business profile, review replies, and your text signature.

### B — A lead arrives through the form

2. Open **Today**.
   > **You should see:** a **Needs attention (N)** card. New leads show a sprout icon and "New lead from …"; a returning inquirer shows "Repeat inquiry…".
   > **Gap [G-03]:** this card is the _only_ place the app tells you a lead arrived — no push, no email. If you skip the morning check, the lead sits invisible. → [findings](../../ops-manual-findings-2026-07-31.md#g-03)
3. Tap the row to open the client. The form already created the client (stage **Lead**) and a property from the service address they typed.
4. Respond **same day**: tap **Call** or **Text**. Speed wins lawns.
5. Back on Today, tap **Got it** only after every row has been actioned — it clears the whole card.

### C — A lead arrives by phone or in person

6. Tab bar → **New → Client**. Enter the name and at least one of phone or email. Turn ON **"This is a lead / prospect"**.
   > **You should see:** if the phone or email matches someone existing, a duplicate warning with a link to them — open the existing record instead of saving a twin.
7. Save.
   > **You should see:** a "Client saved" sheet with **Add a property**, **Create an estimate**, and "Open client →".
8. If you know the address, tap **Add a property** now and use the address autofill — a pinned address is what puts this client on your maps and dispatch later ([reference/clients.md](../reference/clients.md)).

### D — Bulk import

9. **Clients → Import**: choose a CSV file or paste rows, map the Name/Phone/Email/Notes columns (auto-guessed), review the 3-row preview, tap **Import N clients**.
10. **Imported clients arrive as stage Active, not Lead** — the importer assumes an existing customer list. If you imported prospects, open **More → Pipeline** and move them to Lead now.

## Done when

- Every inquiry from today exists as a client, staged **Lead** (or Active if they're truly a customer), with ≥1 contact channel.
- Each got a same-day call or text.
- The **Needs attention** card is empty.

## What can go wrong

| Symptom                                       | Cause                                               | Fix                                                                                      |
| --------------------------------------------- | --------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Prospect says the form shows "Form not found" | Dead or mistyped token                              | Re-copy the link from Business profile and re-share                                      |
| Two records for the same person               | Lead form + manual entry collided                   | **Merge duplicate…** on the client page — SOP-09 step 7                                  |
| Client saved with no phone or email           | You tapped past the soft warning                    | The app never blocks — go back and add one now; you cannot quote a ghost                 |
| Lead arrived days ago, never seen             | Needs attention only shows on Today (14-day window) | Make SOP-05 step 1 non-negotiable — [G-03](../../ops-manual-findings-2026-07-31.md#g-03) |

## Related

[SOP-02](sop-02-estimate-and-delivery.md) (quote them next) · [SOP-09](sop-09-client-lifecycle.md) (stages, merging) · [reference/public-pages.md](../reference/public-pages.md) · [reference/clients.md](../reference/clients.md) · [reference/today.md](../reference/today.md)
