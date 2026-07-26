import type { Service } from './hooks'

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
