# Properties — worklist

Screens: [new](../../src/routes/_authed/properties/new.tsx) ·
[detail](../../src/routes/_authed/properties/$propertyId.index.tsx) ·
[edit](../../src/routes/_authed/properties/$propertyId.edit.tsx) ·
form: `src/features/properties/PropertyForm.tsx`

Apply all four rubric lenses (README) to each item.

- [x] Detail + edit: edge padding `px-edge`; heading `heading-stencil`. _(verified 2026-07-19, already correct: both screens wrap in `px-edge pt-6` and use `heading-stencil` for the h1 and section h2s.)_
- [x] Detail: address/measurements align into columns; numeric values use `tabular-nums`. _(done 2026-07-19: added `tabular-nums` to the three money spans — schedule price, override price, default price. Rows already right-align via justify-between/text-right; no measurement fields exist on the property model.)_
- [x] Detail: link back to owning client is obvious and tappable (≥44px). _(done 2026-07-19: "← Client" link (and the back links on edit/new, same pattern) changed from `inline-block py-2` (~36px) to `inline-flex min-h-touch items-center tap-active` — 48px target. NOTE: clients/jobs detail screens still use the small `py-2` back-link pattern; flagged for those areas, not edited here.)_
- [x] PropertyForm: fields use `Field`; map/geo inputs have labels and sane empty states. _(verified 2026-07-19, already correct: every input/textarea sits in a `Field` wrapper incl. the "Search address" autofill; suggestion list renders nothing when empty and Escape clears it; pin coords are implicit — cleared on hand-edit, re-geocoded on save.)_
- [x] Writes via `enqueue()` with client-generated id; no DB-owned columns in payload. _(verified 2026-07-19, already correct: saveProperty/savePropertyServicePrice enqueue upserts; PropertyDraft has no user_id/created_at/updated_at (those only exist on the cache-only asProperty placeholder, never in the payload); new.tsx generates `crypto.randomUUID()` before save.)_
- [x] Loading uses `Skeleton`; errors use `QueryError`. _(done 2026-07-19: detail + edit now render `SkeletonDetail` while loading and `QueryError` with retry on a cold error, replacing the bare "Loading…" text.)_
- [x] Colors are tokens; primary CTA `bg-blaze`. _(verified 2026-07-19, already correct: grep for hex/gray-\*/etc. across the three routes + PropertyForm finds none; CTAs — "+ Add schedule", PrimaryButton "Save property", "Set" — are `bg-blaze` with `text-on-cta`.)_

## Flow — lead→done (from e2e-audit-2026-06-24)

- [x] New: collapse line1/city/state/zip into an **address autofill** (free Nominatim/OSM geocode → fills fields + lat/lng) to cut taps and fix "no pin" properties that break dispatch routing. _(done 2026-07-19: "Search address" field atop PropertyForm — debounced 400ms, min 4 chars, ≤5 tappable ≥44px rows; a pick fills line1/city/state/zip + lat/lng and the save skips re-geocoding. Nominatim contract stays in lib/geocode.ts (searchAddresses + mapNominatimResult, unit-tested); fetch failure is silent and manual fields stay editable.)_
- [x] After save: show a **next-step row** ("Quote · Schedule · Job" for this property) instead of bare back-nav. _(done 2026-07-19: new.tsx opens the shared `NextStepSheet` after the save enqueues — "Set up recurring visits" (primary → /schedules/new?propertyId), "Create an estimate" (→ /estimates/new?clientId&propertyId), "Book a one-off job" (→ /jobs/new?propertyId), with "Back to client →" as the exit; all three target routes' validateSearch accept those params.)_

## Stage criteria — from pipeline-stage-spec (2026-06-25)

- [x] PropertyForm: require `address_line1` before save — an address-less property gets no geocode/pin and drops off dispatch (G-D1). _(done 2026-06-25, verified. NOTE: geocoding already existed — savePropertyWithGeocode/lib/geocode.ts — earlier "no geocoder" claim was wrong; corrected in spec/audit.)_
- [x] PropertyForm: surface a **geocode miss** ("couldn't pin this address — saved without a map location") since `savePropertyWithGeocode` returns null silently on a Nominatim miss (residual G-D1b). _(done 2026-07-19: savePropertyWithGeocode now fires toast.info "Couldn't pin this address — saved without a map location…" when the address is present but no coords resolve; save itself never blocks.)_
