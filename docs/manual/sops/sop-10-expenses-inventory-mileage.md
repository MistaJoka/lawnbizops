# SOP-10 — Expenses, inventory & mileage

| Trigger                                | Frequency     | Screens                                           | Time         |
| -------------------------------------- | ------------- | ------------------------------------------------- | ------------ |
| Money leaves, stock moves, wheels turn | As it happens | New → Expense, Inventory, Tax center, Field tools | Seconds each |

## TL;DR

Capture every cost **at the moment it happens**: expenses in a 10-second amount→category→receipt-photo flow, job materials logged _from the job_ so profit math works, inventory adjusted as you load the truck, miles logged from the Tax center. The one rule: **capture now — reconstructed-from-memory costs are fiction, and your profit numbers inherit the fiction.**

## ELI5

Every dollar that leaves needs a photo and a label, filed the second it leaves — like a squirrel who writes down every buried nut. Do the ten-second version every time and tax season becomes an afternoon; skip it and January becomes archaeology.

## Steps

### Expenses (the 10-second flow)

1. Tab bar → **New → Expense**: type the amount → tap a category chip → **Add receipt** (camera) → **Save**. That's the whole flow.
   > **You should see:** if the receipt upload hiccups, "Expense saved — add the receipt later" — the money is recorded either way; add the photo from the expense later.
2. When it matters, expand **+ More details** for date, paid-with, vendor, client link, and the **1099 payee** field — tag anyone you'll owe a 1099 (feeds SOP-12).
3. **Job materials get logged FROM the job:** job screen → **+ Log expense** — it arrives pre-linked to the job and client.
   > **Gap [G-04]:** inventory and job costs don't talk — using 3 bags of fertilizer from the truck records nothing against the job by itself. The job-linked expense here is what makes job profitability honest. → [findings](../../ops-manual-findings-2026-07-31.md#g-04)

### Inventory (More → Inventory)

4. As you consume or restock: **Use 1** / **+ Add** on each item's card; tap a card to edit name, unit, location, on-hand, and the low-stock threshold.
5. With inventory alerts on (More → App preferences), low stock shows as a banner on Today's Route view — restock before the day it bites.
   > An emptied inventory now stays empty — the starter list seeds exactly once per device _(was gap [G-14]; fixed 2026-07-31)_. Unused starter rows: **Remove item** in the edit sheet.

### Mileage (More → Tax center)

6. **+ Log trip**: miles, date, purpose, optional client. The deduction uses the mileage rate from More → Tax settings. Log same-day; odometer archaeology never survives an audit.

### Field tools (More → Field tools)

7. **Mulch & stone**: bed square-feet + depth → cubic yards and bag count. Quote from math, not squint.
8. **Grade estimator**: tilts the phone to read slope % and a drainage verdict.
   > On iPhone, tap **Enable tilt sensor** first — iOS requires a one-time motion permission _(was gap [G-10]; fixed 2026-07-31)_. Android needs no prompt.

## Done when

- Every dollar out today is an expense row — job-tagged when a job caused it, receipt attached, payee tagged if 1099-able.
- Truck counts match the app; trips are logged.

## What can go wrong

| Symptom                           | Cause                                                                                    | Fix                                                                                              |
| --------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Job profit looks too good         | Materials never logged to the job ([G-04](../../ops-manual-findings-2026-07-31.md#g-04)) | Make step 3 a load-the-truck habit                                                               |
| Deleted items came back           | Pre-fix behavior (seed-once shipped 2026-07-31)                                          | Remove them once more — they'll stay gone now                                                    |
| Grade tool shows nothing (iPhone) | Motion permission not granted                                                            | Tap **Enable tilt sensor**; if denied, allow Motion & Orientation in browser settings and reload |
| Expense saved, receipt missing    | Upload failed silently-politely                                                          | Open the expense → add the receipt photo now                                                     |

## Related

[SOP-05](sop-05-day-of-operations.md) · [SOP-11](sop-11-weekly-review.md) · [SOP-12](sop-12-tax-season.md) · [reference/more-tools.md](../reference/more-tools.md) · [reference/quick-create.md](../reference/quick-create.md)
