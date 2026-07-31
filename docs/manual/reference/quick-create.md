# Reference — Quick create (the New tab)

Tab 3 (**New**, plus icon) — not a route; opens a sheet with five create flows.

## TL;DR

One global "make a thing" menu: Job, Client, Estimate, Invoice, Expense. Create-only by design — feature navigation lives in More. Every flow accepts deep-link context (`?clientId`, `?propertyId`, `?date`), which is why SOPs always say "start from the client/estimate page": arriving with context pre-fills the form.

## ELI5

The junk drawer handle. Five blank forms behind one plus button — but the forms are smart: walk in from a customer's page and they already know who you mean.

## The five flows

### New job (`/jobs/new`)

Client → Property (auto-picked when they have exactly one) → Service (prefills price; property override beats catalog default) → Price → Title → Date + Start time → **Best day** strip (7 days, each showing distance to your nearest pinned job) → scope/materials notes → **Create job**. Requires property + date. Lands on Schedule for that date.

### New client (`/clients/new`)

Name (required) · Phone · Email · Notes · **"This is a lead / prospect"** switch. Soft warnings only: no-contact, and duplicate detection by phone-digits/email with a link to the twin. On save: a **Client saved** sheet — **Add a property** (primary) / **Create an estimate** / "Open client →".

### New estimate (`/estimates/new`)

Client (required) → Property (optional — but see [G-06](../../ops-manual-findings-2026-07-31.md#g-06)) → line items: one-tap **service chips** from the catalog or **+ Add line** (Description / Qty / Price, X removes) → Valid until (~30 days default) → Notes → live total → **Create estimate**. Creates a Draft and opens it.

### New invoice (`/invoices/new`)

Client → **Done jobs to invoice** checklist (all pre-checked; untick to exclude) → extra lines (chips + **+ Add line**) → subtotal / sales tax / total → **Create invoice**. Due date = today + default due days (Business profile).

### New expense (`/expenses/new`)

The 10-second flow: Amount → Category chips (12) → **Add receipt** (camera) → **Save**. **+ More details** reveals date, paid-with, vendor, client, **1099 payee**, note. A failed receipt upload still saves the expense ("add the receipt later").

## Related creation flows NOT in this menu

- **Property** (`/properties/new`) — only from a client page's **Add property** (needs the client context).
- **Recurring schedule** (`/schedules/new`) — only from a property page, an accepted estimate, or the property-saved sheet.
- **Follow-up task** — inline on Today's Follow-ups and on client pages.
- **Mileage trip / 1099 payee** — from the Tax center ([more-tools.md](more-tools.md)).

## Used in SOPs

[SOP-01](../sops/sop-01-lead-intake.md) · [SOP-02](../sops/sop-02-estimate-and-delivery.md) · [SOP-04](../sops/sop-04-scheduling.md) · [SOP-07](../sops/sop-07-billing-day.md) · [SOP-10](../sops/sop-10-expenses-inventory-mileage.md)

## Known gaps on these flows

[G-06](../../ops-manual-findings-2026-07-31.md#g-06) (property-optional estimates bite later) · [G-16](../../ops-manual-findings-2026-07-31.md#g-16) (no capacity warning when picking a date)
