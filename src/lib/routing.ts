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
