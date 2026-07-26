import type { Service } from './hooks'
import { formatCents, formatCentsShort } from '@/lib/format'

/** Compact per-unit suffixes — the chip has no room for "per square foot". */
const UNIT_SUFFIX: Record<string, string> = {
  hour: '/hr',
  sqft: '/sq ft',
  yard: '/yd',
}

/**
 * Price as it appears on a quick-add chip. A chip is a price list, so it must
 * not misquote the rate or hide its basis: the starter catalog ships per-unit
 * services (Sod Installation is priced by the square foot), and rounding those
 * to whole dollars turned $2.50/sq ft into a bare "$3". Exact cents whenever
 * they carry meaning; k-abbreviation only for large whole amounts, where the
 * rounding costs nothing.
 */
export function serviceChipPrice(cents: number, unit: string): string {
  const suffix = UNIT_SUFFIX[unit] ?? ''
  const money =
    cents % 100 === 0
      ? formatCentsShort(cents) // whole dollars: "$65", "$4.5k"
      : formatCents(cents) // real cents: "$2.50" — never rounded away
  return `${money}${suffix}`
}

/**
 * Catalog row → line draft for the invoice/estimate editors. The price makes a
 * cents → dollar-string → cents round trip (the editor re-parses what we hand
 * it), so this is a money path: whatever the operator priced the service at
 * must land on the invoice to the cent. Pure so that round trip stays pinned.
 */
export function serviceLinePrefill(
  service: Pick<Service, 'name' | 'default_price_cents'>,
): { description: string; dollars: string } {
  return {
    description: service.name,
    // toFixed(2), never toLocaleString: the editor's parser rejects separators.
    dollars: (service.default_price_cents / 100).toFixed(2),
  }
}
