import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import { invoiceTotalCents, invoiceTotalWithTaxCents, taxCents } from './hooks'

// Sales-tax money math (0042). Intent from the migration + code comments:
// tax is computed ONCE on the summed subtotal (never per line), snapshotted in
// bps, rounded half-up to whole cents, and must mirror the invoice_balances
// view: total = subtotal + round(subtotal * tax_bps / 10000).

describe('taxCents', () => {
  it('computes a plain percentage: 7% of $100.00 is $7.00', () => {
    expect(taxCents(10000, 700)).toBe(700)
  })

  it('rounds a half cent up, matching the SQL view on positive subtotals', () => {
    // 700 bps of 50¢ = 3.5¢ — numeric round() and Math.round both give 4.
    expect(taxCents(50, 700)).toBe(4)
  })

  it('rounds down below the half-cent boundary', () => {
    // 700 bps of $10.05 = 70.35¢ → 70.
    expect(taxCents(1005, 700)).toBe(70)
  })

  it('a zero rate or zero subtotal owes zero tax', () => {
    expect(taxCents(12345, 0)).toBe(0)
    expect(taxCents(0, 700)).toBe(0)
  })

  it('is always whole cents and within half a cent of the exact rate', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10_000_000 }),
        fc.integer({ min: 0, max: 2000 }),
        (subtotal, bps) => {
          const tax = taxCents(subtotal, bps)
          expect(Number.isInteger(tax)).toBe(true)
          expect(Math.abs(tax - (subtotal * bps) / 10000)).toBeLessThanOrEqual(0.5)
        },
      ),
    )
  })

  it('never shrinks when the subtotal grows (monotonic at a fixed rate)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10_000_000 }),
        fc.integer({ min: 0, max: 10_000 }),
        fc.integer({ min: 1, max: 2000 }),
        (subtotal, bump, bps) => {
          expect(taxCents(subtotal + bump, bps)).toBeGreaterThanOrEqual(
            taxCents(subtotal, bps),
          )
        },
      ),
    )
  })
})

describe('invoiceTotalWithTaxCents', () => {
  const line = (cents: number, quantity = 1) => ({
    quantity,
    unit_price_cents: cents,
  })

  it('is subtotal plus tax on that subtotal', () => {
    // $150.00 at 6.5% → 975¢ tax.
    expect(invoiceTotalWithTaxCents([line(10000), line(5000)], 650)).toBe(15975)
  })

  it('taxes the summed subtotal, not each line (per-line rounding would differ)', () => {
    // Two 50¢ lines at 7%: on the sum, tax = round(7¢) = 7 → 107.
    // Per-line it would be round(3.5) + round(3.5) = 8 → 108. The view sums first.
    expect(invoiceTotalWithTaxCents([line(50), line(50)], 700)).toBe(107)
  })

  it('taxes the remainder after a deposit deduction line', () => {
    // Final invoice: $200 work minus $50 deposit → tax owed on $150 only.
    expect(invoiceTotalWithTaxCents([line(20000), line(-5000)], 700)).toBe(16050)
  })

  it('a fully deposit-covered invoice owes nothing', () => {
    expect(invoiceTotalWithTaxCents([line(12000), line(-12000)], 700)).toBe(0)
  })

  it('agrees with invoiceTotalCents + taxCents for any line set and rate', () => {
    const anyLine = fc.record({
      quantity: fc.integer({ min: 1, max: 100 }),
      unit_price_cents: fc.integer({ min: -100_000, max: 100_000 }),
    })
    fc.assert(
      fc.property(
        fc.array(anyLine, { maxLength: 20 }),
        fc.integer({ min: 0, max: 2000 }),
        (items, bps) => {
          const subtotal = invoiceTotalCents(items)
          expect(invoiceTotalWithTaxCents(items, bps)).toBe(
            subtotal + taxCents(subtotal, bps),
          )
        },
      ),
    )
  })
})
