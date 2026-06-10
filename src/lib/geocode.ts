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
