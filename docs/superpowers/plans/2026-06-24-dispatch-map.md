# Dispatch Map Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a standalone `/dispatch` screen that shows today's jobs as numbered pins on a real in-app map in drive order, with real road distance/time when online, falling back to the existing haversine ordering offline.

**Architecture:** Three new units on top of existing libs. `src/lib/routing.ts` is a best-effort routing seam (OSRM public server) that returns `null` on any failure so callers fall back to haversine. `src/components/RouteMap.tsx` is a pure presentational Leaflet map (no data fetching). `src/routes/_authed/dispatch.tsx` composes them with the existing `useJobsForDate`, geolocation pattern, `orderByNearestNeighbor`, and `googleMapsRouteUrl`. No schema changes; drive order stays ephemeral.

**Tech Stack:** React 19, TanStack Router (file routes) + Query, Leaflet 1.9 + react-leaflet 5, Vitest + @testing-library/react (jsdom), Tailwind v4 (dark tactical theme tokens).

## Global Constraints

- **Free only.** No paid services, no API keys, no env vars. Map tiles: OpenStreetMap raster (`https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`). Routing: OSRM public demo `https://router.project-osrm.org`. Keep the visible "© OpenStreetMap" attribution.
- **Offline-first (iron rule).** The screen must render and be usable with zero network: cached tiles + cached job lat/lng + haversine ordering + Maps deep link. Road routing is an online-only upgrade.
- **No direct Supabase writes.** This feature has no writes. Do not call `supabase.from(...)` or add to the outbox.
- **Money is integer cents; dates are date-only strings via `localToday()`.** (Not directly exercised here, but do not introduce UTC dates.)
- **Reuse, don't duplicate.** Import `LatLng`, `haversineMiles`, `orderByNearestNeighbor`, `googleMapsRouteUrl` from `@/lib/route`. Do not reimplement them.
- **Theme tokens:** `bg-canvas/bg-panel`, `border-edge`, `text-sand/text-faded/text-khaki`, `bg-blaze` (CTA), `text-go/text-alert`, `heading-stencil` for headers, `tap-active` + big tap targets, `mx-edge`/`px-edge` for page edge padding.
- **Path alias:** `@/` → `src/`.
- **Verify gate (run before declaring any task done):** `npx prettier --write . && npm run lint && npm test && npm run build`.

---

## File Structure

- **Create** `src/lib/routing.ts` — OSRM routing seam. Exports `RouteLeg`, `RouteResult`, `fetchRoadRoute`.
- **Create** `src/lib/routing.test.ts` — unit tests (mocked `fetch`).
- **Create** `src/components/RouteMap.tsx` — presentational Leaflet map. Exports `RouteMap`, `RouteStop`.
- **Create** `src/components/RouteMap.test.tsx` — render test (mocked `react-leaflet`).
- **Create** `src/routes/_authed/dispatch.tsx` — the screen (Route + component).
- **Create** `src/routes/_authed/dispatch.test.tsx` — screen render test (mocked map + query).
- **Modify** `src/routes/_authed/index.tsx` — add a "Map" entry-point link in the Route view.
- **Modify** `package.json` / lockfile — add `leaflet`, `react-leaflet`, `@types/leaflet`.

---

## Task 1: `routing.ts` — OSRM routing seam

**Files:**

- Create: `src/lib/routing.ts`
- Test: `src/lib/routing.test.ts`

**Interfaces:**

- Consumes: `LatLng` from `@/lib/route` (`{ lat: number; lng: number }`).
- Produces:
  - `interface RouteLeg { miles: number; minutes: number }`
  - `interface RouteResult { legs: RouteLeg[]; geometry: LatLng[]; totalMiles: number; totalMinutes: number }`
  - `function fetchRoadRoute(ordered: LatLng[]): Promise<RouteResult | null>` — never throws; returns `null` on offline/HTTP-error/parse-error/fewer-than-2-stops.

**Reference — OSRM response shape** (`GET /route/v1/driving/{lng},{lat};{lng},{lat}?overview=full&geometries=geojson&annotations=false`):

```json
{
  "code": "Ok",
  "routes": [
    {
      "distance": 5000.0,
      "duration": 600.0,
      "geometry": {
        "coordinates": [
          [-81.5, 28.5],
          [-81.4, 28.6]
        ]
      },
      "legs": [{ "distance": 5000.0, "duration": 600.0 }]
    }
  ]
}
```

Units: `distance` is meters, `duration` is seconds, geometry coords are `[lng, lat]`. Convert: miles = meters / 1609.344, minutes = seconds / 60.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/routing.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchRoadRoute } from './routing'

const TWO_STOPS = [
  { lat: 28.5, lng: -81.5 },
  { lat: 28.6, lng: -81.4 },
]

const okJson = (body: unknown) =>
  vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(body) })

const OSRM_OK = {
  code: 'Ok',
  routes: [
    {
      distance: 1609.344,
      duration: 120,
      geometry: {
        coordinates: [
          [-81.5, 28.5],
          [-81.4, 28.6],
        ],
      },
      legs: [{ distance: 1609.344, duration: 120 }],
    },
  ],
}

afterEach(() => vi.unstubAllGlobals())

describe('fetchRoadRoute', () => {
  it('returns null for fewer than 2 stops without calling fetch', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    expect(await fetchRoadRoute([{ lat: 1, lng: 2 }])).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('builds a driving URL with lng,lat pairs joined by semicolons', async () => {
    const fetchMock = okJson(OSRM_OK)
    vi.stubGlobal('fetch', fetchMock)
    await fetchRoadRoute(TWO_STOPS)
    const url = String(fetchMock.mock.calls[0][0])
    expect(url).toContain('router.project-osrm.org/route/v1/driving/')
    expect(url).toContain('-81.5,28.5;-81.4,28.6')
    expect(url).toContain('overview=full')
    expect(url).toContain('geometries=geojson')
  })

  it('parses distance/duration into miles/minutes and maps geometry to lat/lng', async () => {
    vi.stubGlobal('fetch', okJson(OSRM_OK))
    const result = await fetchRoadRoute(TWO_STOPS)
    expect(result).not.toBeNull()
    expect(result!.totalMiles).toBeCloseTo(1, 5)
    expect(result!.totalMinutes).toBeCloseTo(2, 5)
    expect(result!.legs).toEqual([{ miles: expect.closeTo(1, 5), minutes: 2 }])
    expect(result!.geometry).toEqual([
      { lat: 28.5, lng: -81.5 },
      { lat: 28.6, lng: -81.4 },
    ])
  })

  it('returns null on a non-ok HTTP response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))
    expect(await fetchRoadRoute(TWO_STOPS)).toBeNull()
  })

  it('returns null when OSRM code is not Ok', async () => {
    vi.stubGlobal('fetch', okJson({ code: 'NoRoute', routes: [] }))
    expect(await fetchRoadRoute(TWO_STOPS)).toBeNull()
  })

  it('returns null when fetch throws (offline) — never blocks the map', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    expect(await fetchRoadRoute(TWO_STOPS)).toBeNull()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/lib/routing.test.ts`
Expected: FAIL — `fetchRoadRoute` not found / module `./routing` missing.

- [ ] **Step 3: Write the implementation**

Create `src/lib/routing.ts`:

```ts
import type { LatLng } from './route'

export interface RouteLeg {
  miles: number
  minutes: number
}

export interface RouteResult {
  legs: RouteLeg[] // one per hop between consecutive ordered stops
  geometry: LatLng[] // decoded route line, in draw order
  totalMiles: number
  totalMinutes: number
}

const OSRM_BASE = 'https://router.project-osrm.org/route/v1/driving/'
const METERS_PER_MILE = 1609.344

interface OsrmLeg {
  distance: number
  duration: number
}
interface OsrmRoute {
  distance: number
  duration: number
  geometry: { coordinates: [number, number][] }
  legs: OsrmLeg[]
}
interface OsrmResponse {
  code: string
  routes: OsrmRoute[]
}

/**
 * Best-effort road route via the free OSRM demo server (no API key). The map
 * always renders from cached lat/lng + haversine first; this layers real road
 * distance/time/geometry on top when online. Returns null on ANY failure
 * (offline, rate-limit, error, <2 stops) so callers fall back to haversine.
 * Never throws.
 */
export async function fetchRoadRoute(ordered: LatLng[]): Promise<RouteResult | null> {
  if (ordered.length < 2) return null
  const coords = ordered.map((p) => `${p.lng},${p.lat}`).join(';')
  const url = new URL(OSRM_BASE + coords)
  url.searchParams.set('overview', 'full')
  url.searchParams.set('geometries', 'geojson')
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const json = (await res.json()) as OsrmResponse
    if (json.code !== 'Ok' || !json.routes?.[0]) return null
    const route = json.routes[0]
    return {
      legs: route.legs.map((l) => ({
        miles: l.distance / METERS_PER_MILE,
        minutes: l.duration / 60,
      })),
      geometry: route.geometry.coordinates.map(([lng, lat]) => ({ lat, lng })),
      totalMiles: route.distance / METERS_PER_MILE,
      totalMinutes: route.duration / 60,
    }
  } catch {
    return null
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/lib/routing.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/routing.ts src/lib/routing.test.ts
git commit -m "feat(routing): OSRM road-route seam with haversine-safe null fallback"
```

---

## Task 2: `RouteMap.tsx` — presentational Leaflet map

**Files:**

- Create: `src/components/RouteMap.tsx`
- Test: `src/components/RouteMap.test.tsx`
- Modify: `package.json` (add deps)

**Interfaces:**

- Consumes: `LatLng` from `@/lib/route`.
- Produces:
  - `interface RouteStop { id: string; lat: number; lng: number; label: string; seq: number }`
  - `function RouteMap(props: { stops: RouteStop[]; origin: LatLng | null; geometry: LatLng[] | null; selectedId: string | null; onSelect: (id: string) => void }): JSX.Element`
- Rendering notes: numbered pins use `L.divIcon` (avoids Leaflet's broken default-marker image under bundlers). The GPS origin uses `CircleMarker` (also no image asset). When `geometry` is null, the route line is drawn as straight `Polyline` segments through the ordered stops; when present, it draws `geometry`. Map fits bounds to all stops (+origin) on mount.

- [ ] **Step 1: Install map dependencies**

Run:

```bash
npm install leaflet@^1.9.4 react-leaflet@^5.0.0
npm install -D @types/leaflet
```

Expected: added to `package.json`, lockfile updated, no peer-dep errors (react-leaflet 5 targets React 19, which this repo uses).

- [ ] **Step 2: Write the failing render test**

Create `src/components/RouteMap.test.tsx`. Mock `react-leaflet` (jsdom can't lay out a real Leaflet canvas) so we can assert structure:

```tsx
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RouteMap, type RouteStop } from './RouteMap'

// react-leaflet renders a real canvas that jsdom can't measure; stub each
// primitive to a div that exposes its identity + key props for assertions.
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: any) => <div data-testid="map">{children}</div>,
  TileLayer: ({ attribution }: any) => (
    <div data-testid="tiles" data-attribution={attribution} />
  ),
  Marker: ({ children, position }: any) => (
    <div data-testid="marker" data-pos={String(position)}>
      {children}
    </div>
  ),
  CircleMarker: () => <div data-testid="origin" />,
  Polyline: ({ positions }: any) => (
    <div data-testid="polyline" data-count={positions.length} />
  ),
  useMap: () => ({ fitBounds: vi.fn() }),
}))

const STOPS: RouteStop[] = [
  { id: 'a', lat: 28.5, lng: -81.5, label: 'Smith', seq: 1 },
  { id: 'b', lat: 28.6, lng: -81.4, label: 'Jones', seq: 2 },
]

describe('RouteMap', () => {
  it('renders one marker per stop', () => {
    render(
      <RouteMap
        stops={STOPS}
        origin={null}
        geometry={null}
        selectedId={null}
        onSelect={() => {}}
      />,
    )
    expect(screen.getAllByTestId('marker')).toHaveLength(2)
  })

  it('shows the OpenStreetMap attribution (free-tile license)', () => {
    render(
      <RouteMap
        stops={STOPS}
        origin={null}
        geometry={null}
        selectedId={null}
        onSelect={() => {}}
      />,
    )
    expect(screen.getByTestId('tiles').getAttribute('data-attribution')).toMatch(
      /OpenStreetMap/i,
    )
  })

  it('renders the GPS origin marker only when origin is provided', () => {
    const { rerender } = render(
      <RouteMap
        stops={STOPS}
        origin={null}
        geometry={null}
        selectedId={null}
        onSelect={() => {}}
      />,
    )
    expect(screen.queryByTestId('origin')).toBeNull()
    rerender(
      <RouteMap
        stops={STOPS}
        origin={{ lat: 28.4, lng: -81.6 }}
        geometry={null}
        selectedId={null}
        onSelect={() => {}}
      />,
    )
    expect(screen.getByTestId('origin')).toBeTruthy()
  })

  it('draws the road geometry when provided instead of straight segments', () => {
    render(
      <RouteMap
        stops={STOPS}
        origin={null}
        geometry={[
          { lat: 28.5, lng: -81.5 },
          { lat: 28.55, lng: -81.45 },
          { lat: 28.6, lng: -81.4 },
        ]}
        selectedId={null}
        onSelect={() => {}}
      />,
    )
    expect(screen.getByTestId('polyline').getAttribute('data-count')).toBe('3')
  })
})
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm test -- src/components/RouteMap.test.tsx`
Expected: FAIL — module `./RouteMap` missing.

- [ ] **Step 4: Write the component**

Create `src/components/RouteMap.tsx`:

```tsx
import { useEffect } from 'react'
import {
  MapContainer,
  TileLayer,
  Marker,
  CircleMarker,
  Polyline,
  useMap,
} from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { LatLng } from '@/lib/route'

export interface RouteStop {
  id: string
  lat: number
  lng: number
  label: string
  seq: number
}

interface RouteMapProps {
  stops: RouteStop[]
  origin: LatLng | null
  geometry: LatLng[] | null
  selectedId: string | null
  onSelect: (id: string) => void
}

const FALLBACK_CENTER: [number, number] = [27.9944, -81.7603] // central Florida

// Numbered, glove-friendly pin as a divIcon (no external image asset, so it
// survives bundling). Selected pin uses the blaze CTA color.
function numberedIcon(seq: number, selected: boolean): L.DivIcon {
  const bg = selected ? 'var(--color-blaze, #e25822)' : 'var(--color-panel, #1c1c1c)'
  return L.divIcon({
    className: '',
    html: `<div style="width:32px;height:32px;border-radius:9999px;border:2px solid #d8c9a8;background:${bg};color:#f2ead6;font:700 14px/28px ui-monospace,monospace;text-align:center">${seq}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  })
}

function FitBounds({ stops, origin }: { stops: RouteStop[]; origin: LatLng | null }) {
  const map = useMap()
  useEffect(() => {
    const pts: [number, number][] = stops.map((s) => [s.lat, s.lng])
    if (origin) pts.push([origin.lat, origin.lng])
    if (pts.length > 0) map.fitBounds(L.latLngBounds(pts), { padding: [40, 40] })
  }, [map, stops, origin])
  return null
}

export function RouteMap({
  stops,
  origin,
  geometry,
  selectedId,
  onSelect,
}: RouteMapProps) {
  const linePts: [number, number][] = geometry
    ? geometry.map((p) => [p.lat, p.lng])
    : stops.map((s) => [s.lat, s.lng])

  return (
    <MapContainer
      center={FALLBACK_CENTER}
      zoom={11}
      scrollWheelZoom
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds stops={stops} origin={origin} />
      {linePts.length >= 2 && (
        <Polyline
          positions={linePts}
          pathOptions={{ color: '#e25822', weight: 4, opacity: 0.8 }}
        />
      )}
      {origin && (
        <CircleMarker
          center={[origin.lat, origin.lng]}
          radius={7}
          pathOptions={{ color: '#6db56d', fillColor: '#6db56d', fillOpacity: 1 }}
        />
      )}
      {stops.map((s) => (
        <Marker
          key={s.id}
          position={[s.lat, s.lng]}
          icon={numberedIcon(s.seq, s.id === selectedId)}
          eventHandlers={{ click: () => onSelect(s.id) }}
          title={s.label}
        />
      ))}
    </MapContainer>
  )
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test -- src/components/RouteMap.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/components/RouteMap.tsx src/components/RouteMap.test.tsx
git commit -m "feat(map): Leaflet RouteMap with numbered pins, route line, GPS origin"
```

---

## Task 3: `dispatch.tsx` screen + Today entry-point link

**Files:**

- Create: `src/routes/_authed/dispatch.tsx`
- Test: `src/routes/_authed/dispatch.test.tsx`
- Modify: `src/routes/_authed/index.tsx` (add a "Map" link in the Route view)

**Interfaces:**

- Consumes: `useJobsForDate`, `jobsForDateQueryOptions`, `JobWithContext` from `@/features/jobs/hooks`; `orderByNearestNeighbor`, `googleMapsRouteUrl`, `haversineMiles`, `LatLng` from `@/lib/route`; `fetchRoadRoute`, `RouteResult` from `@/lib/routing`; `RouteMap`, `RouteStop` from `@/components/RouteMap`; `localToday` from `@/lib/format`; `loadPreferences` from `@/lib/preferences`; `EmptyState` from `@/components/EmptyState`; `QueryError` from `@/components/QueryError`.
- Produces: the `/_authed/dispatch` file route.

**Composition rules:**

- `jobPos(job)` → `LatLng | null` from `job.property` (same shape as `index.tsx:40`): pinned only when `property.lat` and `property.lng` are both non-null. Reproduce this small helper locally (it is private to `index.tsx`).
- Active jobs = status `scheduled` or `in_progress`. Order them with `orderByNearestNeighbor(origin, active, jobPos)`.
- Build `RouteStop[]` from the **pinned** ordered jobs only, assigning `seq` 1..N in order; `label` = `job.property?.label ?? job.property?.client?.name ?? 'Job'`.
- Unpinned active jobs render in a "Not on map" list below; never block the map.
- Geolocation: copy the existing pattern (gated on `loadPreferences().gpsTracking`, 5s timeout, `null` on failure).
- After ordering, call `fetchRoadRoute(orderedPinnedLatLngs)` in an effect; hold `RouteResult | null` in state. Per-leg label uses road `legs[i].miles`/`minutes` when present, else `haversineMiles` between consecutive stops.

- [ ] **Step 1: Write the failing screen test**

Create `src/routes/_authed/dispatch.test.tsx`. Mock the map and the jobs hook so the screen logic is testable without Leaflet or a backend:

```tsx
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DispatchScreen } from './dispatch'

vi.mock('@/components/RouteMap', () => ({
  RouteMap: ({ stops }: any) => <div data-testid="routemap" data-stops={stops.length} />,
}))
vi.mock('@/lib/routing', () => ({ fetchRoadRoute: vi.fn().mockResolvedValue(null) }))

const mockJobs = vi.fn()
vi.mock('@/features/jobs/hooks', () => ({
  jobsForDateQueryOptions: () => ({ queryKey: ['jobs'], queryFn: async () => [] }),
  useJobsForDate: () => mockJobs(),
}))
vi.mock('@/lib/preferences', () => ({ loadPreferences: () => ({ gpsTracking: false }) }))

const pinnedJob = (id: string, label: string) => ({
  id,
  status: 'scheduled',
  property: { label, lat: 28.5, lng: -81.5, client: { name: label } },
})

describe('DispatchScreen', () => {
  it('renders the map with one stop per pinned active job', () => {
    mockJobs.mockReturnValue({
      data: [pinnedJob('a', 'Smith'), pinnedJob('b', 'Jones')],
      isLoading: false,
      isError: false,
    })
    render(<DispatchScreen />)
    expect(screen.getByTestId('routemap').getAttribute('data-stops')).toBe('2')
  })

  it('lists unpinned active jobs under a "not on map" heading', () => {
    mockJobs.mockReturnValue({
      data: [
        {
          id: 'c',
          status: 'scheduled',
          property: { label: 'NoGeo', lat: null, lng: null },
        },
      ],
      isLoading: false,
      isError: false,
    })
    render(<DispatchScreen />)
    expect(screen.getByText(/not on map/i)).toBeTruthy()
    expect(screen.getByText('NoGeo')).toBeTruthy()
  })

  it('shows an empty state when there are no active jobs today', () => {
    mockJobs.mockReturnValue({ data: [], isLoading: false, isError: false })
    render(<DispatchScreen />)
    expect(screen.getByText(/no jobs/i)).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/routes/_authed/dispatch.test.tsx`
Expected: FAIL — module `./dispatch` missing / `DispatchScreen` not exported.

- [ ] **Step 3: Write the screen**

Create `src/routes/_authed/dispatch.tsx`:

```tsx
import { useEffect, useMemo, useState } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import {
  jobsForDateQueryOptions,
  useJobsForDate,
  type JobWithContext,
} from '@/features/jobs/hooks'
import { RouteMap, type RouteStop } from '@/components/RouteMap'
import { EmptyState } from '@/components/EmptyState'
import { QueryError } from '@/components/QueryError'
import { SkeletonList } from '@/components/Skeleton'
import { queryClient } from '@/lib/queryClient'
import { localToday } from '@/lib/format'
import { loadPreferences } from '@/lib/preferences'
import {
  googleMapsRouteUrl,
  haversineMiles,
  orderByNearestNeighbor,
  type LatLng,
} from '@/lib/route'
import { fetchRoadRoute, type RouteResult } from '@/lib/routing'

export const Route = createFileRoute('/_authed/dispatch')({
  loader: () => queryClient.prefetchQuery(jobsForDateQueryOptions(localToday())),
  component: DispatchScreen,
})

function jobPos(job: JobWithContext): LatLng | null {
  const p = job.property
  return p && p.lat !== null && p.lng !== null ? { lat: p.lat, lng: p.lng } : null
}

function jobLabel(job: JobWithContext): string {
  return job.property?.label ?? job.property?.client?.name ?? 'Job'
}

export function DispatchScreen() {
  const today = localToday()
  const { data: jobs, isLoading, isError } = useJobsForDate(today)
  const [origin, setOrigin] = useState<LatLng | null>(null)
  const [road, setRoad] = useState<RouteResult | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    if (!loadPreferences().gpsTracking) return
    if (!('geolocation' in navigator)) return
    navigator.geolocation.getCurrentPosition(
      (pos) => setOrigin({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setOrigin(null),
      { timeout: 5000, enableHighAccuracy: false },
    )
  }, [])

  const active = useMemo(
    () =>
      (jobs ?? []).filter((j) => j.status === 'scheduled' || j.status === 'in_progress'),
    [jobs],
  )

  const ordered = useMemo(
    () => orderByNearestNeighbor(origin, active, jobPos),
    [origin, active],
  )

  const pinned = useMemo(() => ordered.filter((j) => jobPos(j) !== null), [ordered])
  const unpinned = useMemo(() => ordered.filter((j) => jobPos(j) === null), [ordered])

  const stops: RouteStop[] = pinned.map((j, i) => {
    const p = jobPos(j)!
    return { id: j.id, lat: p.lat, lng: p.lng, label: jobLabel(j), seq: i + 1 }
  })

  // Best-effort road upgrade. Re-run when the pinned set/order changes.
  const stopKey = stops.map((s) => `${s.lat},${s.lng}`).join('|')
  useEffect(() => {
    let cancelled = false
    setRoad(null)
    if (stops.length < 2) return
    fetchRoadRoute(stops.map((s) => ({ lat: s.lat, lng: s.lng }))).then((r) => {
      if (!cancelled) setRoad(r)
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopKey])

  const legMiles = (i: number): number | null => {
    if (road) return road.legs[i - 1]?.miles ?? null
    const prev = stops[i - 1]
    const cur = stops[i]
    return prev && cur ? haversineMiles(prev, cur) : null
  }

  const mapsUrl = googleMapsRouteUrl(stops.map((s) => ({ lat: s.lat, lng: s.lng })))

  if (isLoading) return <SkeletonList />
  if (isError) return <QueryError />

  return (
    <div className="pb-24">
      <header className="mx-edge mt-4 flex items-center justify-between">
        <h1 className="heading-stencil text-lg text-sand">Dispatch</h1>
        <Link to="/" className="tap-active text-sm text-faded">
          Today
        </Link>
      </header>

      {stops.length === 0 ? (
        <EmptyState title="No jobs to map" body="Nothing scheduled for today yet." />
      ) : (
        <>
          <div className="mx-edge mt-4 h-72 overflow-hidden rounded-lg border-2 border-edge">
            <RouteMap
              stops={stops}
              origin={origin}
              geometry={road?.geometry ?? null}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          </div>

          {mapsUrl && (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noreferrer"
              className="heading-stencil tap-active mx-edge mt-4 flex items-center justify-center rounded-lg border-2 border-edge bg-panel py-3 text-sm text-sand"
            >
              Open route in Maps ({stops.length} stop{stops.length === 1 ? '' : 's'})
            </a>
          )}

          <ol className="mx-edge mt-4 space-y-2">
            {stops.map((s, i) => {
              const miles = legMiles(i)
              return (
                <li key={s.id}>
                  <button
                    onClick={() => setSelectedId(s.id)}
                    className={`tap-active flex w-full items-center justify-between rounded-lg border-2 px-4 py-3 text-left ${
                      s.id === selectedId
                        ? 'border-blaze bg-panel'
                        : 'border-edge bg-panel'
                    }`}
                  >
                    <span className="text-sm text-sand">
                      {s.seq}. {s.label}
                    </span>
                    {miles !== null && (
                      <span className="font-mono text-xs text-faded">
                        {miles.toFixed(1)} mi
                      </span>
                    )}
                  </button>
                </li>
              )
            })}
          </ol>
        </>
      )}

      {unpinned.length > 0 && (
        <section className="mx-edge mt-6">
          <h2 className="heading-stencil text-xs text-khaki uppercase">Not on map</h2>
          <ul className="mt-2 space-y-2">
            {unpinned.map((j) => (
              <li
                key={j.id}
                className="rounded-lg border-2 border-edge bg-panel px-4 py-3 text-sm text-faded"
              >
                {jobLabel(j)}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- src/routes/_authed/dispatch.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Add the entry-point link in the Today Route view**

In `src/routes/_authed/index.tsx`, find the "Open route in Maps" anchor block inside `RouteView` (around line 170, the `{mapsUrl && pinnedStops.length >= 1 && (` block). Immediately **after** that closing `)}`, add a link to the new screen:

```tsx
<Link
  to="/dispatch"
  className="heading-stencil tap-active mx-edge mt-4 flex items-center justify-center rounded-lg border-2 border-edge bg-panel py-3 text-sm text-sand"
>
  Open map view
</Link>
```

`Link` is already imported in `index.tsx` (line 2). Place this so it renders whether or not `mapsUrl` exists (it gives access to the map even when no stops are pinned yet).

- [ ] **Step 6: Run the full verification gate**

Run: `npx prettier --write . && npm run lint && npm test && npm run build`
Expected: prettier formats, lint passes, all tests pass (including the new 13), build succeeds. The build is where TanStack Router regenerates `routeTree.gen.ts` to include `/dispatch` — confirm no route-tree errors.

- [ ] **Step 7: Manual preview verification**

Start the dev server (preview tool, `dev` / port 5173). Navigate to `/dispatch`. Confirm: the map renders with OSM tiles, numbered pins appear for today's pinned jobs, the route line draws, "Open route in Maps" and the stop list show, and tapping a list row highlights the matching pin. Capture a screenshot for the user. (If there are no jobs today, seed one via the app or verify the empty state instead.)

- [ ] **Step 8: Commit**

```bash
git add src/routes/_authed/dispatch.tsx src/routes/_authed/dispatch.test.tsx src/routes/_authed/index.tsx src/routeTree.gen.ts
git commit -m "feat(dispatch): map screen wiring active jobs, road route, Maps hand-off"
```

---

## Self-Review

**Spec coverage:**

- In-app map with pins in drive order → Task 2 (`RouteMap`) + Task 3 (composition). ✓
- Real road routing when online → Task 1 (`fetchRoadRoute`) + Task 3 (effect + leg labels). ✓
- Live location (GPS origin) → Task 3 geolocation effect + `CircleMarker` in Task 2. ✓
- Offline-first / haversine fallback → Task 1 returns `null`; Task 2 draws straight segments when `geometry` null; Task 3 `legMiles` falls back to `haversineMiles`. ✓
- Standalone `/dispatch` linked from Today → Task 3 route + index.tsx link (Step 5). ✓
- Free / no keys / OSM attribution → OSM tiles + OSRM in Tasks 1–2; attribution asserted in Task 2 test. ✓
- No schema changes / no writes → no migration, no `enqueue`. ✓
- "Not on map" list for unpinned jobs → Task 3. ✓
- Empty state → Task 3 (`EmptyState`). ✓
- Error states (loading/error) → Task 3 `SkeletonList`/`QueryError`. ✓
- Testing per spec → routing unit tests (Task 1), RouteMap render test (Task 2), screen test (Task 3). ✓
- Increment B/C left out → no `visit_order`, caching seam noted only. ✓

**Placeholder scan:** No TBD/TODO/"handle edge cases"; every code step has full code and exact run commands. ✓

**Type consistency:** `RouteResult`/`RouteLeg`/`fetchRoadRoute` defined in Task 1, consumed unchanged in Task 3. `RouteStop` (`{id,lat,lng,label,seq}`) defined in Task 2, built identically in Task 3. `jobPos` returns `LatLng | null` consistently. `RouteMap` prop names (`stops/origin/geometry/selectedId/onSelect`) identical across Tasks 2 and 3. ✓
