export interface LatLng {
  lat: number
  lng: number
}

const EARTH_RADIUS_MILES = 3958.8

export function haversineMiles(a: LatLng, b: LatLng): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_MILES * Math.asin(Math.sqrt(s))
}

/**
 * Order stops by nearest-neighbor from a start point. Good enough for 5–10
 * stops/day; the Maps app does the actual turn-by-turn. Stops without
 * coordinates keep their relative order and go to the END of the route
 * (he'll know where they are — they just can't be optimized).
 */
export function orderByNearestNeighbor<T>(
  start: LatLng | null,
  stops: T[],
  getPos: (stop: T) => LatLng | null,
): T[] {
  const pinned = stops.filter((s) => getPos(s) !== null)
  const unpinned = stops.filter((s) => getPos(s) === null)
  if (pinned.length === 0) return [...stops]

  const remaining = [...pinned]
  const ordered: T[] = []
  let cursor = start ?? getPos(remaining[0])!

  while (remaining.length > 0) {
    let bestIdx = 0
    let bestDist = Infinity
    for (let i = 0; i < remaining.length; i++) {
      const d = haversineMiles(cursor, getPos(remaining[i])!)
      if (d < bestDist) {
        bestDist = d
        bestIdx = i
      }
    }
    const [next] = remaining.splice(bestIdx, 1)
    ordered.push(next)
    cursor = getPos(next)!
  }
  return [...ordered, ...unpinned]
}

/**
 * Multi-stop Google Maps directions URL (works in Chrome on Android and
 * everywhere else; Apple Maps has no multi-stop URL scheme). Last stop is the
 * destination, the rest are waypoints.
 */
export function googleMapsRouteUrl(stops: LatLng[]): string | null {
  if (stops.length === 0) return null
  const fmt = (p: LatLng) => `${p.lat.toFixed(6)},${p.lng.toFixed(6)}`
  const destination = stops[stops.length - 1]
  const waypoints = stops.slice(0, -1)
  const url = new URL('https://www.google.com/maps/dir/')
  url.searchParams.set('api', '1')
  url.searchParams.set('destination', fmt(destination))
  url.searchParams.set('travelmode', 'driving')
  if (waypoints.length > 0) {
    url.searchParams.set('waypoints', waypoints.map(fmt).join('|'))
  }
  return url.toString()
}
