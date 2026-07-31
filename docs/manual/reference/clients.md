# Reference — Clients, properties & schedules

Routes `/clients`, `/clients/import`, `/clients/$id`, `/pipeline`, `/properties/*`, `/schedules/*` · Tab 4.

## TL;DR

The relationship half of the app: the searchable client list, the densest screen in the app (client detail — stage control, economics, timeline, properties), the CSV importer, the four-column Pipeline board, and the property pages where addresses get pinned, prices get overridden, and recurring schedules live.

## ELI5

The address book — but each contact's page is also their whole folder: what stage they're at, what they owe, every conversation, every yard, and the standing appointment for each yard.

## Screen tour

### Clients list (`/clients`)

1. Search box — matches **name, email, or phone digits** ("954555" and "(954) 555" both hit).
2. Header links: **Import**, **Pipeline**, **+ Client**.
3. Rows: stage dot (Lead orange · Quoted sand · Active green · Dormant faded), name, tap → detail, **Call** / **Text** icons.

### CSV import (`/clients/import`)

Three steps: choose file or paste → map columns (auto-guessed; Name required; blank-name rows warn + skip) with live 3-row preview → **Import N clients**. **Imported clients arrive staged Active** — restage prospects afterward (SOP-01 step 10).

### Client detail (`/clients/$id`)

1. **Stage control** — Lead / Quoted / Active / Dormant segmented control. Soft-gated: advancing without the stage's usual evidence raises "Move anyway" naming what's missing.
2. **Readiness chips** (Lead/Quoted only) — "Needs: Contact / Property / Estimate", each deep-linking to the prefilled fix.
3. **Call / Text** buttons · email (mail) link · notes card.
4. **Open balance** card → Money.
5. **Client economics** — YTD Collected / Costs / Profit + **+ Log expense**.
6. **Stage-aware primary CTA** — **Create estimate** (Lead/Quoted) or **Schedule work** (Active/Dormant); the other sits one row below. Both carry client + property when there's exactly one property.
7. **Follow-ups** — quick-add prefilled for this client.
8. **Activity timeline** — notes, calls, stage/status changes, documents sent. The ONLY place notes can be written ([G-24](../../ops-manual-findings-2026-07-31.md#g-24)).
9. **Properties** list — red **"no pin"** flag for un-geocoded addresses; **Add property**.
10. **Merge duplicate…** — searchable picker + destructive confirm; moves properties, quotes, invoices, and history to the keeper, archives the duplicate.
11. **Archive client** (confirm) — pause/delete their schedules first (SOP-09 step 7).

### Pipeline board (`/pipeline`, via More)

Four stage columns. Cards: name · open balance · Call/Text · stage CTA (**Quote** / **Schedule**) · **Advance →** (same soft gate). The monthly-hygiene home (SOP-09).

### Property detail (`/properties/$id`)

Address card (Google Maps link, "no pin" flag) · gate code · notes · **Recurring schedule** list (cadence + price, "Paused" badge, tap → edit) · **+ Add schedule** · **Service prices** — tap any catalog service to set a property-specific override (shows default vs "this property").

### Property form (new/edit)

Type toggle (residential/commercial) · label · **address autofill** (type 4+ characters, pick a suggestion — picking is what pins the map location) · address lines, city, state, zip · gate code · notes. Hand-editing an address field clears the pin so it re-geocodes on save. On save: a **Property saved** sheet — **Set up recurring visits** (primary) / **Create an estimate** / **Book a one-off job**.

### Schedule form (`/schedules/new`, edit)

Cadence (Every week / Every 2 weeks / Every 4 weeks / Monthly on a set day) · first visit date · day-of-month (monthly) · service · price · ends-on · notes · live **"Next visits:"** 4-date preview. Edit adds **Pause** (optional auto-resume date; the nightly sweep lifts it) / **Resume schedule** / **Delete schedule** (online-only, [G-19](../../ops-manual-findings-2026-07-31.md#g-19)).

## States

- List empty vs no-matches states are distinct; import step 2 warns on skipped rows; forms soft-warn (duplicates, no contact) but never block.

## Used in SOPs

[SOP-01](../sops/sop-01-lead-intake.md) · [SOP-03](../sops/sop-03-winning-the-work.md) · [SOP-04](../sops/sop-04-scheduling.md) · [SOP-09](../sops/sop-09-client-lifecycle.md)

## Known gaps on these screens

[G-07](../../ops-manual-findings-2026-07-31.md#g-07) (winning work doesn't advance stage) · [G-11](../../ops-manual-findings-2026-07-31.md#g-11) (dormancy manual) · [G-13](../../ops-manual-findings-2026-07-31.md#g-13) (property page: no job history/CTAs/delete; override not clearable) · [G-17](../../ops-manual-findings-2026-07-31.md#g-17) (no global search) · [G-24](../../ops-manual-findings-2026-07-31.md#g-24) (notes only here) · [G-25](../../ops-manual-findings-2026-07-31.md#g-25) (no skip-next-visit)
