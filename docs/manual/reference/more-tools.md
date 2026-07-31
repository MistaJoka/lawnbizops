# Reference — More hub: work tools

Route `/settings` (Tab 6, **More**) → the **Work** group: Dashboard, Pipeline, Dispatch map, Inventory, Field tools, Reports, Tax center. (Pipeline is covered in [clients.md](clients.md); Reports in [money.md](money.md); the Settings group in [settings.md](settings.md).)

## TL;DR

Everything that didn't earn a bottom tab: the orientation Dashboard, the live Dispatch map with road routing, truck Inventory, two field calculators, and the Tax center. All one tap from **More**.

## ELI5

The garage shelf. Not what you hold all day, but you know exactly where each tool hangs: the map, the parts bin, the measuring tools, and the tax folder.

## Screen tour

### More hub (`/settings`)

Groups top to bottom: **Work** (this file) · **Settings** ([settings.md](settings.md)) · **System** (Export data, Sync issues — [settings.md](settings.md)) · **Install this app** card (browser installs; hidden once installed) · **Sign out**.

### Dashboard (`/dashboard`)

One-glance orientation; **every metric is a link**: Collected this month → Reports · Outstanding → Money · Open pipeline → Pipeline · Jobs scheduled/done this week → Schedule · Open follow-ups (+ overdue count) → Today · Clients-by-stage grid → Pipeline. Used in: [SOP-11](../sops/sop-11-weekly-review.md).

### Dispatch map (`/dispatch`)

Today's Scheduled + In-progress jobs on a live map with an ordered stop list.

1. Map: numbered pins (selected pin highlighted), green origin dot, orange route line, auto-fit. Road distances/geometry upgrade in when the free routing service responds; straight-line fallback otherwise — silently.
2. **Open route in Maps (N stops)** — the multi-stop Google Maps deep link.
3. Stop list: tap a pin or row to select → **Start** / **Done** · **Navigate** (turn-by-turn to that stop) · **Details** (→ job) · gate code · time window inline.
4. **Not on map** — jobs whose property has no pin, each linking to the fix.

Ordering is nearest-neighbor from your GPS position (or first pinned job when GPS is off). Used in: [SOP-05](../sops/sop-05-day-of-operations.md). Gaps: [G-15](../../ops-manual-findings-2026-07-31.md#g-15).

### Inventory (`/inventory`)

**Low stock** count + **Total SKUs** cards · search · **+ Item** · per-card **+ Add** / **Use 1** · tap a card → edit sheet (name, unit, location, on-hand, low-stock-at, **Remove item**). Low stock banners onto Today's Route view when the preference is on. Seeds a starter list once per device on first empty load (seed-once since 2026-07-31 — an emptied inventory stays empty). Used in: [SOP-10](../sops/sop-10-expenses-inventory-mileage.md).

### Field tools (`/tools`)

- **Mulch & stone** (`/tools/mulch`) — bed area (sq ft) + depth (in) → cubic yards + bag count. `(no SOP — utility feature)` beyond its mention in SOP-10.
- **Grade estimator** (`/tools/grade`) — live phone-tilt slope % + drainage verdict ("Too flat" / "Good drainage range" / "Steep — check runoff"); sensor-unavailable fallback message. On iOS, **Enable tilt sensor** requests the required motion permission (fixed 2026-07-31).

### Tax center (`/tax`)

1. **Set aside for taxes** — % × YTD net (prompts to configure when unset).
2. **Mileage** — YTD miles + deduction · **+ Log trip** (`/tax/mileage/new`: miles, date, purpose, optional client).
3. **Schedule C — expenses by line** — categories mapped to IRS Part II line numbers.
4. **1099 payees** — YTD totals · **+ Add payee** (`/tax/payees/new`: name, tax ID, email, address, tracking toggle).
5. Standing disclaimer: cash-basis helpers, not tax advice.

Used in: [SOP-10](../sops/sop-10-expenses-inventory-mileage.md), [SOP-12](../sops/sop-12-tax-season.md).

## Known gaps in this group

[G-15](../../ops-manual-findings-2026-07-31.md#g-15) · [G-21](../../ops-manual-findings-2026-07-31.md#g-21) · _G-10 and G-14 fixed 2026-07-31_
