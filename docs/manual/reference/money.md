# Reference — Money

Routes `/money` (Invoices | Estimates | Expenses tabs), `/invoices/*`, `/estimates/*`, `/expenses/$id`, `/money/reports` · Tab 5.

## TL;DR

Everything with a dollar sign: three searchable ledgers under one tab, the invoice screen (payments, reversals, void, email/PDF/reminders), the status-driven estimate screen (draft → sent → accepted/declined → converted), and the Reports page (P&L, categories, methods, job profitability, aging).

## ELI5

The cash register, the bill drawer, and the "who owes me" clipboard, all bolted together — plus a monthly report card that grades which lawns are actually worth mowing.

## Screen tour

### Money home (`/money`)

1. Header links: **Reports**, **Dashboard**.
2. **Month header** — Collected / Spent / Net, month-to-date.
3. **Invoices tab:** **Outstanding** card with A/R aging chips (Current / 1–30 / 31–60 / 61–90 / 90+) · **Nudge overdue (N)** → sheet with per-invoice prefilled-SMS **Nudge** buttons (stamps + logs each) · **Unbilled work** card — done-but-uninvoiced jobs grouped by client, per-row deep link to a prefilled New invoice, and **Invoice all (N clients)** batch (confirmed) · search + **+ Invoice** · rows: number, status chip, client, total, issue date, "Nd overdue" alert tone, balance, "nudged N days ago".
4. **Estimates tab:** **Awaiting response** card — sent-and-unanswered quotes with **Follow up** per row (prefilled SMS + activity log) · search + **+ Estimate** · rows: number, status, client, total, dates.
5. **Expenses tab:** search (category/vendor/client) + **+ Expense** · rows: category, amount, date, vendor, client.

### Invoice detail (`/invoices/$id`)

Number · status chip · issued/due · client card (Email + Call) · line items · subtotal → sales tax → total → paid → **Balance** · payments ledger.

| Action                        | Behavior                                                                                                                                  |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **Record payment**            | Sheet: amount (prefilled to balance), method (Cash/Check/Zelle/Card (external)/Other — remembers last), date, note. Overpayment blocked.  |
| **Reverse** (per payment row) | Posts an offsetting negative line; append-only; hidden once reversed.                                                                     |
| **Email invoice**             | Real email via the outbox; needs client email; shows "Emailed <date>".                                                                    |
| **Share PDF**                 | Native share; disabled until the number syncs ([G-09](../../ops-manual-findings-2026-07-31.md#g-09)); sharing a draft auto-marks it Sent. |
| **Send reminder**             | Share/clipboard friendly message + stamps the reminder.                                                                                   |
| **Void invoice**              | Confirmed; reverses recorded payments, returns jobs to Done.                                                                              |

### Estimate detail (`/estimates/$id`) — actions appear by status

| Status             | Actions                                                                                                                                                                                                                                                                                                                                  |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Draft              | **Email estimate** (primary; needs email) · **Mark sent** · **Edit** · **Delete draft** · Share PDF                                                                                                                                                                                                                                      |
| Sent               | **Send approval link** · **Accepted** / **Declined** (decline sheet: Price too high / Bad timing / Went with someone else / No response + free text) · **Email estimate** · **Edit** · Share PDF                                                                                                                                         |
| Accepted           | **Create job** card (date → **Create job**; inline **+ Add property** if none) · **Create recurring schedule** (only when a property exists — [G-06](../../ops-manual-findings-2026-07-31.md#g-06)) · **Deposit** card (25% / 50% / custom → flagged deposit invoice) · **Convert to invoice** (one-to-one guarded; deducts the deposit) |
| Declined / Expired | **Renew estimate** (fresh 30-day draft)                                                                                                                                                                                                                                                                                                  |
| Always             | Share PDF · photos · client Call/Email · decline-reason card when present                                                                                                                                                                                                                                                                |

### Expense detail (`/expenses/$id`)

Edit amount/category/date/paid-with/vendor/note · **Delete expense** (confirm) · receipts (add photo, tap to delete). The client link is display-only.

### Reports (`/money/reports`)

Date-range picker (presets) · **Profit & loss (cash basis)** — Income (collected) / Expenses / Net · **Expenses by category** · **Income by method** · **Job profitability (billed)** — top 8 by profit, best and worst · **A/R aging (open)** · **Share PDF** (logo included) · whole-range empty state.

**Money-basis labeling:** "Collected" = payments by date received (P&L, client economics). "Billed" = invoice issue date (job profitability). The app labels which basis every number uses — read the label before comparing.

## Used in SOPs

[SOP-02](../sops/sop-02-estimate-and-delivery.md) · [SOP-03](../sops/sop-03-winning-the-work.md) · [SOP-07](../sops/sop-07-billing-day.md) · [SOP-08](../sops/sop-08-collections.md) · [SOP-11](../sops/sop-11-weekly-review.md)

## Known gaps on these screens

[G-01](../../ops-manual-findings-2026-07-31.md#g-01) (no online payment) · [G-05](../../ops-manual-findings-2026-07-31.md#g-05) (estimate→job drops service) · [G-06](../../ops-manual-findings-2026-07-31.md#g-06) · [G-09](../../ops-manual-findings-2026-07-31.md#g-09) (PDF needs synced number) · [G-12](../../ops-manual-findings-2026-07-31.md#g-12) (no discounts/late fees/statements/credits) · [G-20](../../ops-manual-findings-2026-07-31.md#g-20) (token-only approval) · [G-21](../../ops-manual-findings-2026-07-31.md#g-21) (no trend/by-service reports)
