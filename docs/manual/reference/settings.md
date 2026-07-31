# Reference — Settings & system

Route `/settings` → the **Settings** group (Business profile, Service catalog, Automations, Payments, Tax settings, App preferences) and **System** group (Export data, Sync issues).

## TL;DR

Where the business gets described once so every document, price, and automation flows from it. Note the split: business settings live on the server (and need connectivity to save — [G-19](../../ops-manual-findings-2026-07-31.md#g-19)); App preferences are device-local toggles.

## ELI5

The filing cabinet behind the counter: your letterhead, your price list, the "robot chores" switchboard, and the drawer of paper exports. Set it up once, touch it rarely.

## Screen tour

### Business profile (`/settings/profile`)

| Field                                              | Feeds                                                                  |
| -------------------------------------------------- | ---------------------------------------------------------------------- |
| Business name / phone / email / address            | Letterhead on estimate & invoice PDFs and emails                       |
| Invoice prefix (`INV-`) / Estimate prefix (`EST-`) | Server-assigned document numbers                                       |
| Default due days                                   | Invoice due dates (issue + N)                                          |
| **Labor rate ($/hr)**                              | Time-on-site labor cost in job profitability (0 = off)                 |
| **Google review link**                             | The job screen's "Request a Google review" button                      |
| **Quote request link** (+ **Share link**)          | Your public lead-intake form — [SOP-01](../sops/sop-01-lead-intake.md) |
| **Logo** (upload/replace/remove)                   | Estimate, invoice, and report PDFs                                     |

### Service catalog (`/settings/services`)

**+ Add service** · tap a row to edit inline (name, description, price, unit: flat rate / per hour / per sq ft / per yard) · **Archive** · **Load starter catalog** when empty. Feeds the one-tap chips on estimates/invoices and price-prefill on jobs; per-property overrides beat these defaults ([clients.md](clients.md)).

### Automations (`/settings/automations`)

Four auto-saving toggles driving the nightly 7:15 AM sweep:

| Toggle                              | What the robot does                               |
| ----------------------------------- | ------------------------------------------------- |
| Follow up after a job (+N days)     | Creates a follow-up task after each completed job |
| Overdue invoice reminders (+N days) | Creates an in-app task per newly-overdue invoice  |
| Email overdue reminders             | Emails the customer (weekly re-nudge cap)         |
| Email visit reminders               | Morning-of email to customers with visits today   |

The sweep also (untoggleable): flags unbilled work, flags missed jobs, expires stale quotes past Valid-until, and creates quote follow-up tasks at ~3 days of silence.

### Payments (`/settings/payments`)

Pick Square or PayPal, or Clear. **Preference only** — the screen itself says online card collection isn't built yet ([G-01](../../ops-manual-findings-2026-07-31.md#g-01)). `(no SOP — inert until the feature ships)`

### Tax settings (`/settings/tax`)

Business type · Tax ID (EIN/SSN) · standard mileage rate · **sales tax %** (applies to invoices created _after_ it's set; capped 0–50%) · **set aside for taxes %**. Feeds the Tax center ([SOP-12](../sops/sop-12-tax-season.md)).

### App preferences (`/settings/preferences`) — device-local

**GPS tracking** (drive-order origin) · **Inventory alerts** (Today banner) · **Prefer offline cache** (data saver) · Help & docs link · version stamp. These do not sync between devices.

### Export data (`/settings/export`) — System

CSV downloads for 7 datasets: Clients, Properties, Services, Jobs, Invoices, Payments, Estimates. Online-only. Used in: [SOP-12](../sops/sop-12-tax-season.md).

### Sync issues (`/settings/sync`) — System

Pending-count · **Sync now** · per-failed-operation **Retry** / **Discard** (destructive confirm) with error text and attempt counts. Used in: [SOP-13](../sops/sop-13-offline-field-protocol.md).

## Known gaps on these screens

[G-01](../../ops-manual-findings-2026-07-31.md#g-01) (payments screen is a stub) · [G-19](../../ops-manual-findings-2026-07-31.md#g-19) (settings saves are online-only) · [G-02](../../ops-manual-findings-2026-07-31.md#g-02) (no editable message templates live here yet — proposed home)
