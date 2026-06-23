import { afterEach, describe, expect, it, vi } from 'vitest'
import { geocodeAddress } from './geocode'

const ADDR = {
  address_line1: '1600 Pennsylvania Ave',
  city: 'Washington',
  state: 'DC',
  zip: '20500',
}

const okJson = (body: unknown) =>
  vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(body) })

afterEach(() => vi.unstubAllGlobals())

describe('geocodeAddress', () => {
  it('parses lat/lon from the first match', async () => {
    vi.stubGlobal('fetch', okJson([{ lat: '38.8977', lon: '-77.0365' }]))

    expect(await geocodeAddress(ADDR)).toEqual({ lat: 38.8977, lng: -77.0365 })
  })

  it('builds a US, single-result jsonv2 query from the address parts', async () => {
    const fetchMock = okJson([{ lat: '1', lon: '2' }])
    vi.stubGlobal('fetch', fetchMock)

    await geocodeAddress(ADDR)

    const url = new URL(String(fetchMock.mock.calls[0][0]))
    expect(url.origin + url.pathname).toBe('https://nominatim.openstreetmap.org/search')
    expect(url.searchParams.get('q')).toContain('1600 Pennsylvania Ave')
    expect(url.searchParams.get('q')).toContain('20500')
    expect(url.searchParams.get('format')).toBe('jsonv2')
    expect(url.searchParams.get('limit')).toBe('1')
    expect(url.searchParams.get('countrycodes')).toBe('us')
  })

  it('returns null on a non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: () => [] }))
    expect(await geocodeAddress(ADDR)).toBeNull()
  })

  it('returns null when there are no matches', async () => {
    vi.stubGlobal('fetch', okJson([]))
    expect(await geocodeAddress(ADDR)).toBeNull()
  })

  it('returns null when the coordinates are not finite numbers', async () => {
    vi.stubGlobal('fetch', okJson([{ lat: 'not-a-number', lon: '' }]))
    expect(await geocodeAddress(ADDR)).toBeNull()
  })

  it('returns null when fetch throws (offline) — geocoding never blocks a save', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    expect(await geocodeAddress(ADDR)).toBeNull()
  })
})
