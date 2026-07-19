# Properties — worklist

Screens: [new](../../src/routes/_authed/properties/new.tsx) ·
[detail](../../src/routes/_authed/properties/$propertyId.index.tsx) ·
[edit](../../src/routes/_authed/properties/$propertyId.edit.tsx) ·
form: `src/features/properties/PropertyForm.tsx`

Apply all four rubric lenses (README) to each item.

- [ ] Detail + edit: edge padding `px-edge`; heading `heading-stencil`.
- [ ] Detail: address/measurements align into columns; numeric values use `tabular-nums`.
- [ ] Detail: link back to owning client is obvious and tappable (≥44px).
- [ ] PropertyForm: fields use `Field`; map/geo inputs have labels and sane empty states.
- [ ] Writes via `enqueue()` with client-generated id; no DB-owned columns in payload.
- [ ] Loading uses `Skeleton`; errors use `QueryError`.
- [ ] Colors are tokens; primary CTA `bg-blaze`.

## Flow — lead→done (from e2e-audit-2026-06-24)

- [x] New: collapse line1/city/state/zip into an **address autofill** (free Nominatim/OSM geocode → fills fields + lat/lng) to cut taps and fix "no pin" properties that break dispatch routing. _(done 2026-07-19: "Search address" field atop PropertyForm — debounced 400ms, min 4 chars, ≤5 tappable ≥44px rows; a pick fills line1/city/state/zip + lat/lng and the save skips re-geocoding. Nominatim contract stays in lib/geocode.ts (searchAddresses + mapNominatimResult, unit-tested); fetch failure is silent and manual fields stay editable.)_
- [ ] After save: show a **next-step row** ("Quote · Schedule · Job" for this property) instead of bare back-nav.

## Stage criteria — from pipeline-stage-spec (2026-06-25)

- [x] PropertyForm: require `address_line1` before save — an address-less property gets no geocode/pin and drops off dispatch (G-D1). _(done 2026-06-25, verified. NOTE: geocoding already existed — savePropertyWithGeocode/lib/geocode.ts — earlier "no geocoder" claim was wrong; corrected in spec/audit.)_
- [x] PropertyForm: surface a **geocode miss** ("couldn't pin this address — saved without a map location") since `savePropertyWithGeocode` returns null silently on a Nominatim miss (residual G-D1b). _(done 2026-07-19: savePropertyWithGeocode now fires toast.info "Couldn't pin this address — saved without a map location…" when the address is present but no coords resolve; save itself never blocks.)_
