# SOP-07 — Billing day

| Trigger                                                               | Frequency | Screens                          | Time    |
| --------------------------------------------------------------------- | --------- | -------------------------------- | ------- |
| End of the work week, or whenever the Unbilled work card is non-empty | Weekly    | Money → Invoices, Invoice detail | ~20 min |

## TL;DR

Every job marked Done becomes a **sent** invoice in one sitting. The **Unbilled work** card on Money → Invoices is the master list — batch it, then send each draft. The one rule: **billing day ends when the Unbilled work card is empty and every new invoice reads Sent.** Unsent drafts are money you decided not to ask for.

## ELI5

All week you mowed lawns and marked them done — like dropping receipts in a shoebox. Billing day is when you empty the shoebox: the app has already grouped the receipts by customer, so you press one button to turn them into bills, then send each bill on its way. Work you never bill is charity with extra steps.

## Before you start

- [ ] This week's finished jobs are actually marked **Done** (check the board's Done lane — SOP-05).
- [ ] You're online — sending, and the server-assigned invoice numbers, need it.
- [ ] If you charge sales tax, the rate is set in More → Tax settings (it applies to **new** invoices only).

## Steps

1. Open **Money** → **Invoices** tab.
   > **You should see:** the **Outstanding** card with aging chips, and below it an **Unbilled work** card listing done-but-uninvoiced jobs grouped by client with a total.
2. **The batch path (default):** tap **Invoice all (N clients)** → confirm.
   > **You should see:** one draft invoice created per client. This is the whole week in one tap.
3. **The per-client path (when you want control):** tap a client's row instead → the New invoice screen opens with their done jobs **pre-checked** — untick any to hold back, add extra lines (service chips or **+ Add line**), check the subtotal → tax → total, then **Create invoice**.
4. Two other creation paths you'll use during the week:
   - **From the board:** a Done card's **Invoice →** button; if that client has other done jobs it asks **Include all** or **Just this one**.
   - **From an accepted estimate:** **Convert to invoice** — copies the lines and **automatically deducts any deposit** as a "Less deposit received" line (SOP-03).
5. **Discounts:** there is no discount field.
   > **Gap [G-12]:** add a negative line item ("Loyalty discount — −$20"). Same for any credit. → [findings](../../ops-manual-findings-2026-07-31.md#g-12)
6. **Send every draft.** Open each invoice and pick:
   - **Email invoice** — needs a client email; the sub-line confirms "Emailed <date>" after.
   - **Share PDF** — text/AirDrop/print it; a successful share auto-flips the draft to Sent.
     > **Gap [G-09]:** disabled until the invoice number syncs ("Syncs first — number pending"). → [findings](../../ops-manual-findings-2026-07-31.md#g-09)
     > **Gap [G-01]:** none of these let the customer _pay_ — there's no pay link. Put your payment instructions (Zelle handle, check payee) in the invoice notes so the ask travels with the bill. → [findings](../../ops-manual-findings-2026-07-31.md#g-01)
7. Scroll back up: confirm the **Unbilled work card is gone** and each new invoice's row shows Sent with a due date (issue date + your default due days).

## Done when

- Unbilled work card: empty.
- Every invoice created today: status **Sent**, customer verifiably has it.
- Deposits taken earlier appear as deductions, not forgotten credits.

## What can go wrong

| Symptom                               | Cause                                                                                       | Fix                                                                                                                                                                                  |
| ------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A finished job isn't in Unbilled work | It was never marked Done (or was Skipped)                                                   | Fix its status on the board/job page, come back                                                                                                                                      |
| **Share PDF** greyed out              | Number pending sync ([G-09](../../ops-manual-findings-2026-07-31.md#g-09))                  | Sync first, or **Email invoice** — it queues offline                                                                                                                                 |
| **Email invoice** greyed out          | No email on the client                                                                      | Add one, or share the PDF by text                                                                                                                                                    |
| Worried a double-tap double-billed    | Board's Invoice → pressed twice                                                             | Check the client's invoice list in Money; the estimate path is guarded one-to-one, the job path relies on the in-flight guard — delete/void a duplicate draft if one slipped through |
| Deposit wasn't deducted               | Final invoice was built from jobs, not via **Convert to invoice** on the deposit's estimate | Add the deduction as a negative line ([G-12](../../ops-manual-findings-2026-07-31.md#g-12))                                                                                          |

## Related

[SOP-05](sop-05-day-of-operations.md) (feeds this) · [SOP-08](sop-08-collections.md) (what happens next) · [reference/money.md](../reference/money.md)
