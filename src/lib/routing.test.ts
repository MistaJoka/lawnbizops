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
