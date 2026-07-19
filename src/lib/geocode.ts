export interface GeocodeInput {
  address_line1: string
  city: string
  state: string
  zip: string
}

/**
 * Free OpenStreetMap Nominatim geocoder — no API key, CORS-enabled, fine for
 * one user at ~1 req/sec (we geocode only on property save). The US Census
 * geocoder was rejected: it sends no CORS headers, so browsers can't call it.
 * Returns null on any miss or failure; a property without a pin simply drops
 * out of drive-ordering until re-geocoded, never blocks saving.
 */
/** One tappable row in the address-autofill suggestion list. */
export interface AddressSuggestion {
  /** Full Nominatim display line, shown as the row text. */
  display: string
  address_line1: string
  city: string
  state: string
  zip: string
  lat: number
  lng: number
}

/** Raw Nominatim /search item (jsonv2 + addressdetails=1) — only what we read. */
export interface NominatimResult {
  lat: string
  lon: string
  display_name?: string
  address?: {
    house_number?: string
    road?: string
    city?: string
    town?: string
    village?: string
    hamlet?: string
    state?: string
    postcode?: string
    'ISO3166-2-lvl4'?: string
  }
}

/**
 * Map one raw Nominatim result to form-ready fields. Pure — unit tested.
 * Returns null when coordinates are missing or garbage: a suggestion without a
 * pin is useless, since the whole point of autofill is fixing pin-less
 * properties that drop out of dispatch routing.
 */
export function mapNominatimResult(result: NominatimResult): AddressSuggestion | null {
  const lat = parseFloat(result.lat)
  const lng = parseFloat(result.lon)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  const a = result.address ?? {}
  const address_line1 = [a.house_number, a.road].filter(Boolean).join(' ')
  const city = a.city ?? a.town ?? a.village ?? a.hamlet ?? ''
  // "US-FL" → "FL"; fall back to the spelled-out state name if the code is absent.
  const state = a['ISO3166-2-lvl4']?.split('-')[1] ?? a.state ?? ''
  const zip = a.postcode ?? ''
  const display =
    result.display_name ??
    [address_line1, city, [state, zip].filter(Boolean).join(' ')]
      .filter(Boolean)
      .join(', ')
  return { display, address_line1, city, state, zip, lat, lng }
}

/**
 * Address-autofill search against the same free Nominatim endpoint. Callers
 * must debounce (≥300ms) and keep at most one request in flight (pass an
 * AbortSignal) to respect the service's usage policy. Returns [] on any miss,
 * abort, or failure — offline, manual entry simply keeps working.
 */
export async function searchAddresses(
  query: string,
  signal?: AbortSignal,
): Promise<AddressSuggestion[]> {
  const url = new URL('https://nominatim.openstreetmap.org/search')
  url.searchParams.set('q', query)
  url.searchParams.set('format', 'jsonv2')
  url.searchParams.set('addressdetails', '1')
  url.searchParams.set('limit', '5')
  url.searchParams.set('countrycodes', 'us')
  try {
    const res = await fetch(url, { signal })
    if (!res.ok) return []
    const json = (await res.json()) as NominatimResult[]
    return json.map(mapNominatimResult).filter((s): s is AddressSuggestion => s !== null)
  } catch {
    return []
  }
}

export async function geocodeAddress(
  input: GeocodeInput,
): Promise<{ lat: number; lng: number } | null> {
  const q = `${input.address_line1}, ${input.city}, ${input.state} ${input.zip}`
  const url = new URL('https://nominatim.openstreetmap.org/search')
  url.searchParams.set('q', q)
  url.searchParams.set('format', 'jsonv2')
  url.searchParams.set('limit', '1')
  url.searchParams.set('countrycodes', 'us')
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const json = (await res.json()) as { lat: string; lon: string }[]
    const match = json[0]
    if (!match) return null
    const lat = parseFloat(match.lat)
    const lng = parseFloat(match.lon)
    return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null
  } catch {
    return null
  }
}
