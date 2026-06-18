import { describe, expect, it } from 'vitest'
import { googleMapsRouteUrl, haversineMiles, orderByNearestNeighbor } from './route'

// Real South Florida coordinates
const wpb = { lat: 26.7141, lng: -80.0544 } // West Palm Beach
const lakeWorth = { lat: 26.6168, lng: -80.0684 } // ~7 mi south
const boca = { lat: 26.3683, lng: -80.1289 } // ~24 mi south
const jupiter = { lat: 26.9342, lng: -80.0942 } // ~15 mi north

describe('haversineMiles', () => {
  it('measures WPB → Boca at roughly 24 miles', () => {
    const d = haversineMiles(wpb, boca)
    expect(d).toBeGreaterThan(22)
    expect(d).toBeLessThan(27)
  })
  it('is zero for identical points', () => {
    expect(haversineMiles(wpb, wpb)).toBe(0)
  })
})

describe('orderByNearestNeighbor', () => {
  it('orders stops by drive proximity from the start', () => {
    const stops = [
      { id: 'boca', pos: boca },
      { id: 'jupiter', pos: jupiter },
      { id: 'lakeworth', pos: lakeWorth },
    ]
    const ordered = orderByNearestNeighbor(wpb, stops, (s) => s.pos)
    expect(ordered.map((s) => s.id)).toEqual(['lakeworth', 'boca', 'jupiter'])
  })

  it('puts unpinned stops at the end, keeping their order', () => {
    const stops = [
      { id: 'nopin1', pos: null },
      { id: 'boca', pos: boca },
      { id: 'nopin2', pos: null },
      { id: 'lakeworth', pos: lakeWorth },
    ]
    const ordered = orderByNearestNeighbor(wpb, stops, (s) => s.pos)
    expect(ordered.map((s) => s.id)).toEqual(['lakeworth', 'boca', 'nopin1', 'nopin2'])
  })

  it('falls back to first pinned stop as start when no start position', () => {
    const stops = [
      { id: 'boca', pos: boca },
      { id: 'lakeworth', pos: lakeWorth },
      { id: 'jupiter', pos: jupiter },
    ]
    const ordered = orderByNearestNeighbor(null, stops, (s) => s.pos)
    expect(ordered.map((s) => s.id)).toEqual(['boca', 'lakeworth', 'jupiter'])
  })

  it('handles all-unpinned by returning original order', () => {
    const stops = [
      { id: 'a', pos: null },
      { id: 'b', pos: null },
    ]
    expect(orderByNearestNeighbor(wpb, stops, (s) => s.pos).map((s) => s.id)).toEqual([
      'a',
      'b',
    ])
  })
})

describe('googleMapsRouteUrl', () => {
  it('builds destination + waypoints', () => {
    const url = googleMapsRouteUrl([lakeWorth, wpb, jupiter])!
    const parsed = new URL(url)
    expect(parsed.searchParams.get('destination')).toBe('26.934200,-80.094200')
    expect(parsed.searchParams.get('waypoints')).toBe(
      '26.616800,-80.068400|26.714100,-80.054400',
    )
    // The deep link must request the directions API in driving mode.
    expect(parsed.searchParams.get('api')).toBe('1')
    expect(parsed.searchParams.get('travelmode')).toBe('driving')
  })
  it('single stop has no waypoints', () => {
    const url = googleMapsRouteUrl([wpb])!
    expect(new URL(url).searchParams.get('waypoints')).toBeNull()
  })
  it('returns null for empty stops', () => {
    expect(googleMapsRouteUrl([])).toBeNull()
  })
})
