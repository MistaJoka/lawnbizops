import { afterEach, describe, expect, it, vi } from 'vitest'
import { geocodeAddress, mapNominatimResult, searchAddresses } from './geocode'
import type { NominatimResult } from './geocode'

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

const RAW: NominatimResult = {
  lat: '25.7743',
  lon: '-80.1937',
  display_name: '123 Palmetto Street, Miami, Florida, 33101, United States',
  address: {
    house_number: '123',
    road: 'Palmetto Street',
    city: 'Miami',
    state: 'Florida',
    postcode: '33101',
    'ISO3166-2-lvl4': 'US-FL',
  },
}

describe('mapNominatimResult', () => {
  it('maps a full result to form-ready fields with the two-letter state', () => {
    expect(mapNominatimResult(RAW)).toEqual({
      display: '123 Palmetto Street, Miami, Florida, 33101, United States',
      address_line1: '123 Palmetto Street',
      city: 'Miami',
      state: 'FL',
      zip: '33101',
      lat: 25.7743,
      lng: -80.1937,
    })
  })

  it('falls back to town/village when there is no city', () => {
    const town = mapNominatimResult({
      ...RAW,
      address: { ...RAW.address, city: undefined, town: 'Homestead' },
    })
    expect(town?.city).toBe('Homestead')
    const village = mapNominatimResult({
      ...RAW,
      address: { ...RAW.address, city: undefined, village: 'Briny Breezes' },
    })
    expect(village?.city).toBe('Briny Breezes')
  })

  it('falls back to the spelled-out state when the ISO code is absent', () => {
    const s = mapNominatimResult({
      ...RAW,
      address: { ...RAW.address, 'ISO3166-2-lvl4': undefined },
    })
    expect(s?.state).toBe('Florida')
  })

  it('composes a display line when display_name is missing', () => {
    const s = mapNominatimResult({ ...RAW, display_name: undefined })
    expect(s?.display).toBe('123 Palmetto Street, Miami, FL 33101')
  })

  it('leaves fields blank rather than inventing them on a sparse result', () => {
    const s = mapNominatimResult({ lat: '1', lon: '2' })
    expect(s).toEqual({
      display: '',
      address_line1: '',
      city: '',
      state: '',
      zip: '',
      lat: 1,
      lng: 2,
    })
  })

  it('returns null when the coordinates are not finite numbers', () => {
    expect(mapNominatimResult({ ...RAW, lat: 'nope' })).toBeNull()
    expect(mapNominatimResult({ ...RAW, lon: '' })).toBeNull()
  })
})

describe('searchAddresses', () => {
  it('queries Nominatim with addressdetails and a 5-result US cap', async () => {
    const fetchMock = okJson([RAW])
    vi.stubGlobal('fetch', fetchMock)

    const results = await searchAddresses('123 Palmetto')

    const url = new URL(String(fetchMock.mock.calls[0][0]))
    expect(url.origin + url.pathname).toBe('https://nominatim.openstreetmap.org/search')
    expect(url.searchParams.get('q')).toBe('123 Palmetto')
    expect(url.searchParams.get('format')).toBe('jsonv2')
    expect(url.searchParams.get('addressdetails')).toBe('1')
    expect(url.searchParams.get('limit')).toBe('5')
    expect(url.searchParams.get('countrycodes')).toBe('us')
    expect(results).toHaveLength(1)
    expect(results[0].state).toBe('FL')
  })

  it('drops rows the mapper rejects', async () => {
    vi.stubGlobal('fetch', okJson([RAW, { ...RAW, lat: 'nope' }]))
    expect(await searchAddresses('123 Palmetto')).toHaveLength(1)
  })

  it('returns [] on a non-ok response and when fetch throws (offline)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: () => [] }))
    expect(await searchAddresses('123 Palmetto')).toEqual([])
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    expect(await searchAddresses('123 Palmetto')).toEqual([])
  })
})
