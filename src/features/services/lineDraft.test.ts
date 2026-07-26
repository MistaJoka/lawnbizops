import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import { serviceChipPrice, serviceLinePrefill } from './lineDraft'
import { parseDollarsToCents } from '@/lib/format'

// A quick-add chip is a money path: the catalog price becomes a dollar string
// that the line editor immediately re-parses into cents. Whatever the operator
// priced a service at must land on the invoice to the cent — no drift through
// the round trip.

const svc = (name: string, cents: number) => ({ name, default_price_cents: cents })

describe('serviceLinePrefill', () => {
  it('carries the service name as the line description', () => {
    expect(serviceLinePrefill(svc('Palm Trimming', 14000)).description).toBe(
      'Palm Trimming',
    )
  })

  it('renders whole dollars with cents the editor accepts', () => {
    expect(serviceLinePrefill(svc('Lawn Maintenance', 6500)).dollars).toBe('65.00')
  })

  it('keeps odd cents exactly (no rounding to the dollar)', () => {
    expect(serviceLinePrefill(svc('Odd job', 12345)).dollars).toBe('123.45')
  })

  it('handles a large four-figure service without separators the parser rejects', () => {
    const { dollars } = serviceLinePrefill(svc('Paver Driveway', 450000))
    expect(dollars).toBe('4500.00')
    expect(parseDollarsToCents(dollars)).toBe(450000)
  })

  it('a zero-priced service prefills 0.00, not an empty or NaN price', () => {
    expect(serviceLinePrefill(svc('Consult', 0)).dollars).toBe('0.00')
    expect(parseDollarsToCents('0.00')).toBe(0)
  })

  it('round-trips ANY catalog price back to the exact same cents', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 100_000_000 }), (cents) => {
        const { dollars } = serviceLinePrefill(svc('Service', cents))
        expect(parseDollarsToCents(dollars)).toBe(cents)
      }),
    )
  })
})

// A chip is a price list: it must not misquote the rate or hide the basis.
// The starter catalog ships per-unit services (Sod Installation is priced by
// the square foot), and the old chip rendered those with formatCentsShort —
// $2.50/sq ft displayed as "$3", with no hint it was per-unit at all.
describe('serviceChipPrice', () => {
  it('shows exact cents for sub-dollar-precision rates, never rounded', () => {
    expect(serviceChipPrice(250, 'sqft')).toBe('$2.50/sq ft')
    expect(serviceChipPrice(350, 'sqft')).toBe('$3.50/sq ft')
  })

  it('names the basis for every non-flat unit', () => {
    expect(serviceChipPrice(8500, 'yard')).toBe('$85/yd')
    expect(serviceChipPrice(6000, 'hour')).toBe('$60/hr')
  })

  it('leaves a flat rate bare — the price IS the price', () => {
    expect(serviceChipPrice(6500, 'flat')).toBe('$65')
  })

  it('drops trailing .00 so whole dollars stay compact', () => {
    expect(serviceChipPrice(14000, 'flat')).toBe('$140')
  })

  it('abbreviates only large whole amounts, where rounding costs nothing', () => {
    expect(serviceChipPrice(450000, 'flat')).toBe('$4.5k')
  })
})
