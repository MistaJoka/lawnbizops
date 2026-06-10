export interface GeocodeInput {
  address_line1: string
  city: string
  state: string
  zip: string
}

/**
 * Free US Census geocoder — no API key, fine for one user. Returns null on any
 * miss or failure; a property without a pin simply drops out of drive-ordering
 * until re-geocoded, never blocks saving.
 */
export async function geocodeAddress(
  input: GeocodeInput,
): Promise<{ lat: number; lng: number } | null> {
  const oneline = `${input.address_line1}, ${input.city}, ${input.state} ${input.zip}`
  const url = new URL(
    'https://geocoding.geo.census.gov/geocoder/locations/onelineaddress',
  )
  url.searchParams.set('address', oneline)
  url.searchParams.set('benchmark', 'Public_AR_Current')
  url.searchParams.set('format', 'json')
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const json = (await res.json()) as {
      result?: { addressMatches?: { coordinates: { x: number; y: number } }[] }
    }
    const match = json.result?.addressMatches?.[0]
    return match ? { lat: match.coordinates.y, lng: match.coordinates.x } : null
  } catch {
    return null
  }
}
