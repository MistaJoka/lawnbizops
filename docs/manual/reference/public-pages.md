# Reference — Public pages & account gates

Routes `/quote/$token` and `/e/$token` (public, no login) · `/login`, `/onboarding`, `/billing` (account gates).

## TL;DR

Two pages your **customers** see without any login — the quote-request form and the estimate-approval page — plus the three gates you pass through on the way into the app: login, first-run onboarding, and subscription billing.

## ELI5

Your shop has a storefront window (two pages customers use from their own phones) and a staff door with three locks (who are you, set up your shop, is the rent paid). Customers never see the staff door; you never think about the window until a customer is standing at it.

## Screen tour

### Quote request form (`/quote/$token`) — customer-facing

The link you share from Business profile → **Quote request link** ([SOP-01](../sops/sop-01-lead-intake.md)).

1. Fields: Name (required) · Phone · Email · Service address · "What do you need?"
2. **Request my quote** — requires name + phone-or-email. Shows a "Request sent" confirmation.
3. Behind the scenes: creates a client (stage **Lead**) + property, and posts a "New lead from…" activity to your **Needs attention** card. Repeat submitters show as "Repeat inquiry" instead of duplicating.
4. A dead/rotated token renders "Form not found."

### Estimate approval (`/e/$token`) — customer-facing

The link sent by **Email estimate** or **Send approval link** ([SOP-02](../sops/sop-02-estimate-and-delivery.md)).

1. Your letterhead, estimate number, "Prepared for", issue/valid-through dates, line items, total, notes.
2. **Approve this estimate** (green) · **Decline** — first tap reveals an optional "Mind sharing why?" box, second tap confirms.
3. Responding flips the estimate's status and posts "Customer approved/declined…" to your attention card. The page locks after a response or past the validity date (status banner explains).
4. Identity is the link itself — no name or signature is captured ([G-20](../../ops-manual-findings-2026-07-31.md#g-20)).

### Login (`/login`)

Email + password sign-in, or the "New here? Create a business account" toggle (adds a Business-name field that names your org). Email-confirmation aware. Signed-in visits redirect home.

### Onboarding (`/onboarding`) — first run only

Business name (required) · phone · two toggles: **Load starter services** (8 common services, on by default) and **Add a sample customer** (off by default) · **Finish setup** → lands on Today.

### Billing (`/billing`)

Current plan state (Pro — active / Free trial — N days left / Trial ended / Payment past due / Canceled) · plan buttons → Stripe Checkout · **Manage billing** → Stripe portal (active plans) · back-to-app (when access is valid) · Sign out. The app routes you here automatically when access lapses.

## Used in SOPs

[SOP-01](../sops/sop-01-lead-intake.md) · [SOP-02](../sops/sop-02-estimate-and-delivery.md). Gates: `(no SOP — passed once, then invisible)`

## Known gaps on these pages

[G-20](../../ops-manual-findings-2026-07-31.md#g-20) (token-only approval) · [G-02](../../ops-manual-findings-2026-07-31.md#g-02) (the approval page tells customers to reply to the message that delivered it — because the app can't receive)
