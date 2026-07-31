# SOP-12 — Tax season

| Trigger                                 | Frequency          | Screens                                        | Time    |
| --------------------------------------- | ------------------ | ---------------------------------------------- | ------- |
| Quarterly estimated-tax dates + January | Quarterly / annual | Tax center, Tax settings, Reports, Export data | ~1 hour |

## TL;DR

The Tax center is a cash-basis helper, not an accountant: it computes your set-aside, maps expense categories onto Schedule C lines, totals mileage and 1099 payees, and Export data hands your accountant clean CSVs. The one rule: **the accountant gets exports, not screenshots** — and the app's own disclaimer stands: these are filing helpers, not tax advice.

## ELI5

All year the squirrel filed its nuts (SOP-10). Tax season is when the filing pays off: the app has already sorted the nuts into the government's official piles, counted your driving, and remembered who you paid enough to owe paperwork. You copy the piles out and hand them to the tax person. No shoebox archaeology.

## Before you start

- [ ] One-time: **More → Tax settings** — business type, Tax ID, standard mileage rate, sales-tax %, and **Set aside for taxes %** are filled in.
- [ ] Expenses, mileage, and 1099 payees were captured all year (SOP-10). If not, this SOP becomes archaeology after all.

## Steps

### Quarterly (15 minutes)

1. **More → Tax center.** Read the **Set aside for taxes** card — YTD net × your % — and actually move that amount to your tax savings account. The card computes; you transfer.
2. Check **Mileage** — YTD miles and the deduction. Thin numbers mean trips aren't being logged; fix the habit now, not in January.
3. If you collect sales tax: remit per your state's calendar. The app snapshots the rate onto each invoice; the remitting is yours.

### January (the annual hour)

4. **1099s:** Tax center lists YTD totals per tracked payee. Anyone at $600+ gets a 1099 — filed outside the app. Missing someone? They weren't tagged as a 1099 payee on their expenses (SOP-10 step 2) — add the payee and re-tag.
5. **Schedule C:** the expenses-by-line card maps your categories onto Schedule C Part II line numbers. This is the crosswalk your accountant will love you for.
6. **Full-year P&L:** Money → Reports, range = last year → **Share PDF**.
7. **More → Export data:** download all seven CSVs (Clients, Properties, Services, Jobs, Invoices, Payments, Estimates) — online only — and send the bundle plus the P&L to your accountant.

## Done when

- Quarterly: set-aside transferred, mileage current, sales tax remitted.
- Annual: 1099s filed, CSV bundle + P&L delivered, accountant not cursing your name.

## What can go wrong

| Symptom                                  | Cause                                               | Fix                                                      |
| ---------------------------------------- | --------------------------------------------------- | -------------------------------------------------------- |
| Set-aside card prompts for configuration | % never set                                         | Tax settings → Set aside for taxes %                     |
| A payee's total looks low                | Some payments to them weren't tagged                | Edit those expenses; add the 1099 payee                  |
| Export buttons disabled                  | Offline                                             | Wifi; exports are online-only                            |
| Sales tax missing from old invoices      | Rate applies to invoices created _after_ it was set | Expected — handle pre-rate invoices with your accountant |

## Related

[SOP-10](sop-10-expenses-inventory-mileage.md) · [SOP-11](sop-11-weekly-review.md) · [reference/more-tools.md](../reference/more-tools.md) · [reference/settings.md](../reference/settings.md)
