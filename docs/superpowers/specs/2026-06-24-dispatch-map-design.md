# Dispatch Map Screen — Design

**Date:** 2026-06-24
**Status:** Approved (brainstorming)
**Topic:** Add an in-app map, live location, and real road routing via a new
`/dispatch` screen.

## Goal

Give the operator a map-centric view of today's jobs: see the day's stops as
numbered pins in drive order, with a drawn route line, real road distance/time
when online, and a one-tap hand-off to Google Maps for turn-by-turn. The screen
must remain fully usable offline.

This is **increment A** of a gradual rollout (see Roadmap below). It visualizes
the existing nearest-neighbor drive order on a real map and layers real road
routing on top as an online enhancement. No schema changes.

## Constraints & principles

- **Free only.** No paid services, no API keys. Map: Leaflet + free OSM/Carto
  raster tiles (keep the required "© OpenStreetMap" attribution). Routing:
  OSRM public demo server (`router.project-osrm.org`), no key.
- **Offline-first (iron rule).** The screen works with zero network: cached
  tiles + cached job lat/lng + haversine ordering + Maps deep link. Road
  routing is a best-effort online upgrade only.
- **No direct Supabase writes.** v1 has no writes at all (order stays
  ephemeral). When increment B adds persistence it goes through `enqueue()`.
- **Reuse, don't duplicate.** Build on the existing
  [`src/lib/route.ts`](../../../src/lib/route.ts) (haversine,
  `orderByNearestNeighbor`, `googleMapsRouteUrl`),
  [`src/lib/geocode.ts`](../../../src/lib/geocode.ts) (lat/lng already on every
  property), and the geolocation pattern in
  [`src/routes/_authed/index.tsx`](../../../src/routes/_authed/index.tsx).

## Decisions (from brainstorming)

| # | Decision | Choice |
|---|----------|--------|
| Scope | Which gap | **D** — full map-centric dispatch screen (map + real routing + live location) |
| Placement | Where it lives | **C** — standalone `/dispatch` screen, linked from the Today view (TabBar is already full at 5 tabs) |
| Offline | Behavior | **A now → C later** — map + haversine offline, real routing layers in when online; cache-for-the-day (C) added automatically once stable |
| Reorder | Order model | **A now → B later** — auto-only ephemeral order in v1; manual drag + persisted `visit_order` is the next increment |
| Map lib | Rendering | **Leaflet** (+ `react-leaflet`), raster tiles, ~40KB, tiles cache naturally |
| Routing | Engine | **OSRM public demo**, behind a swappable `routingProvider` seam (ORS / self-host later) |
| Attribution | Tile credit | **Yes** — "© OpenStreetMap" stays visible (free-tile license requirement) |

## Architecture

Three new units plus reuse of existing libs.

### 1. `src/lib/routing.ts` (new) — routing seam

The single boundary between the app and any road-routing provider.

```ts
export interface RouteLeg { miles: number; minutes: number }
export interface RouteResult {
  legs: RouteLeg[]          // one per hop between consecutive ordered stops
  geometry: LatLng[]        // decoded polyline for drawing the route line
  totalMiles: number
  totalMinutes: number
}

// Best-effort. Returns null on ANY failure (offline, rate-limit, 4xx/5xx,
// parse error) so the caller falls back to haversine. Never throws.
export async function fetchRoadRoute(
  ordered: LatLng[],
): Promise<RouteResult | null>
```

- Backed by OSRM `GET /route/v1/driving/{lng,lat;lng,lat;...}?overview=full&geometries=geojson&annotations=distance,duration`.
- Converts meters→miles and seconds→minutes at the boundary (app stays in the
  units it already uses).
- `LatLng` imported from `route.ts` (single source of truth).
- This is also where increment **C** (compute-once-and-cache-today's-route)
  drops in — a caching wrapper around `fetchRoadRoute`, no caller changes.

### 2. `src/components/RouteMap.tsx` (new) — presentational map

Pure view, no data fetching.

Props:
- `stops`: ordered array of `{ id, lat, lng, label, status, seq }`
- `origin`: `LatLng | null` (GPS "you are here")
- `geometry`: `LatLng[] | null` (road line when available; else component draws
  straight segments between stops)
- `selectedId` / `onSelect`: for pin ↔ list-row sync

Renders: numbered pins in drive order (seq badge), the route polyline, a
distinct "you are here" dot, and the OSM attribution control. Fits bounds to
the stops on mount. Big, glove-friendly markers per theme conventions.

### 3. `src/routes/_authed/dispatch.tsx` (new) — the screen

TanStack Router file route. Composes everything:

- `useJobsForDate(localToday())` → today's jobs; filter to active
  (`scheduled` / `in_progress`).
- Geolocation via the existing pattern (gated on the `gpsTracking` preference,
  5s timeout, `null` on denial/failure).
- `orderByNearestNeighbor(origin, activeJobs, jobPos)` → ordered stops (always
  runs, offline-safe).
- `useEffect` calls `fetchRoadRoute(orderedLatLngs)` when ordered changes;
  result held in state. `null` → keep haversine.
- Renders `<RouteMap>` on top + a synced list below (tap pin highlights row and
  vice versa). Per-leg distance shows road miles/minutes when available, else
  haversine miles (existing `legMiles` style).
- One "Open in Maps" button → `googleMapsRouteUrl(pinnedStops)` (existing).
- Unpinned jobs (no lat/lng) listed under the map as "not on map" — never block
  rendering.

**Entry point:** a "Map" / "Dispatch" link added to the Today Route view
([index.tsx](../../../src/routes/_authed/index.tsx)) near the existing "Open
route in Maps" button.

## Data flow (offline-first, behavior A)

```
useJobsForDate(today) ──► active jobs
   └─► orderByNearestNeighbor(gpsOrigin, jobs)      [always works, offline]
         └─► render pins + straight polyline immediately
         └─► fetchRoadRoute(orderedLatLngs)         [online only, best-effort]
               ├─ success → upgrade polyline to road geometry + real mi/min
               └─ null    → keep haversine straight lines + haversine miles
```

## Error handling / degradation

| Condition | Behavior |
|-----------|----------|
| No GPS / denied | Start order from first pinned job (existing fallback); no "you are here" dot |
| Job has no lat/lng | Listed below map as "not on map"; excluded from pins/route; never blocks |
| Offline / tiles missing | Cached tiles render where previously seen; pins + haversine order + Maps link still work |
| OSRM error / rate-limit / timeout | `fetchRoadRoute` → `null` → haversine straight lines + haversine distances |
| No jobs today | Empty state (reuse `EmptyState`), map centered on GPS or last-known |

## Testing

- **`routing.ts`** (unit, mocked `fetch`): valid OSRM response → correct
  `RouteResult` (units converted, legs counted); HTTP error → `null`; network
  throw → `null`; empty/short input → `null`.
- **`RouteMap.tsx`** (render test): N stops → N numbered pins; origin present →
  "you are here" marker; geometry null → straight segments drawn.
- Screen reuses already-tested `route.ts` / `geocode.ts`; no new coverage for
  those.
- Gate: `npx prettier --write . && npm run lint && npm test && npm run build`.

## New dependencies

- `leaflet`, `react-leaflet`, `@types/leaflet` (all MIT, free).
- No API keys. No env vars. No new Supabase objects.

## Out of scope (future increments)

- **B — manual reorder:** drag pins/rows; persist per-day `visit_order` (new
  nullable column, written via `enqueue`). Auto remains the default.
- **C — cache-today's-route:** wrap `fetchRoadRoute` so the morning's road
  route is computed once on signal and served offline all day. Triggered
  automatically once the screen is stable.
- Geofenced arrival/departure, ETA notifications, mileage-log auto-fill from
  computed legs, TSP optimization beyond nearest-neighbor.
