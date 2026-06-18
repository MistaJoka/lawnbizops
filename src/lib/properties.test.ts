import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import { haversineMiles, orderByNearestNeighbor } from './route'
import { csvField, parseCsv } from './csv'
import { addDaysISO } from './dates'
import { occurrencesBetween, type Cadence } from './recurrence'
import { formatCents, parseDollarsToCents } from './format'
import {
  invoiceTotalCents,
  lineTotalCents,
  agingBucket,
  AGING_BUCKETS,
} from '@/features/invoices/hooks'

// Property-based tests: assert invariants over thousands of generated inputs,
// catching edge cases example tests miss. These are the conservation laws of the
// pure logic — money, dates, CSV escaping, and the drive-order algorithm.

const latLng = fc.record({
  lat: fc.double({ min: -90, max: 90, noNaN: true }),
  lng: fc.double({ min: -180, max: 180, noNaN: true }),
})

// ---------------------------------------------------------------------------
// Drive-order (nearest-neighbor) — the only non-trivial pure algorithm
// ---------------------------------------------------------------------------
describe('orderByNearestNeighbor', () => {
  const stop = fc.record({ pos: fc.option(latLng, { nil: null }) })

  it('output is always a permutation of the input (none lost, none invented)', () => {
    fc.assert(
      fc.property(fc.option(latLng, { nil: null }), fc.array(stop), (start, stops) => {
        const indexed = stops.map((s, i) => ({ ...s, id: i }))
        const out = orderByNearestNeighbor(start, indexed, (s) => s.pos)
        expect(out).toHaveLength(indexed.length)
        expect(out.map((s) => s.id).sort((a, b) => a - b)).toEqual(
          indexed.map((s) => s.id).sort((a, b) => a - b),
        )
      }),
    )
  })

  it('pinned stops always come before unpinned (un-coordinated go to the end)', () => {
    fc.assert(
      fc.property(fc.option(latLng, { nil: null }), fc.array(stop), (start, stops) => {
        const out = orderByNearestNeighbor(start, stops, (s) => s.pos)
        let seenUnpinned = false
        for (const s of out) {
          if (s.pos === null) seenUnpinned = true
          else expect(seenUnpinned).toBe(false)
        }
      }),
    )
  })
})

describe('haversineMiles', () => {
  it('is symmetric, non-negative, and zero for the same point', () => {
    fc.assert(
      fc.property(latLng, latLng, (a, b) => {
        const ab = haversineMiles(a, b)
        expect(ab).toBeGreaterThanOrEqual(0)
        expect(haversineMiles(b, a)).toBeCloseTo(ab, 6)
        expect(haversineMiles(a, a)).toBeCloseTo(0, 6)
      }),
    )
  })
})

// ---------------------------------------------------------------------------
// CSV escaping round-trip — exactly where fuzzing earns its keep
// ---------------------------------------------------------------------------
describe('CSV escaping', () => {
  // Serialize rows the way toCsv does (cells → csvField → join), then parse back.
  const serialize = (rows: string[][]) =>
    rows.map((r) => r.map(csvField).join(',')).join('\r\n') + '\r\n'

  it('round-trips arbitrary cells through quote/comma/newline escaping', () => {
    const row = fc
      .array(fc.string(), { minLength: 1, maxLength: 5 })
      // a single empty cell is indistinguishable from a blank line by design
      .filter((r) => !(r.length === 1 && r[0] === ''))
    fc.assert(
      fc.property(fc.array(row, { minLength: 1, maxLength: 6 }), (rows) => {
        expect(parseCsv(serialize(rows))).toEqual(rows)
      }),
    )
  })
})

// ---------------------------------------------------------------------------
// Money — integer-cent arithmetic
// ---------------------------------------------------------------------------
describe('money arithmetic', () => {
  const cents = fc.integer({ min: -100_000_000, max: 100_000_000 })
  const item = fc.record({
    quantity: fc.integer({ min: 0, max: 10_000 }),
    unit_price_cents: fc.integer({ min: 0, max: 10_000_000 }),
  })

  it('formatCents → parseDollarsToCents round-trips any integer cents', () => {
    fc.assert(
      fc.property(cents, (c) => {
        expect(parseDollarsToCents(formatCents(c))).toBe(c)
      }),
    )
  })

  it('invoice total equals the sum of per-line totals', () => {
    fc.assert(
      fc.property(fc.array(item), (items) => {
        const summed = items.reduce((s, i) => s + lineTotalCents(i), 0)
        expect(invoiceTotalCents(items)).toBe(summed)
      }),
    )
  })

  it('invoice total is additive across concatenation', () => {
    fc.assert(
      fc.property(fc.array(item), fc.array(item), (a, b) => {
        expect(invoiceTotalCents([...a, ...b])).toBe(
          invoiceTotalCents(a) + invoiceTotalCents(b),
        )
      }),
    )
  })
})

// ---------------------------------------------------------------------------
// Dates — YYYY-MM-DD arithmetic across month/year/DST boundaries
// ---------------------------------------------------------------------------
describe('addDaysISO', () => {
  const isoDate = fc
    .date({ min: new Date(2001, 0, 1), max: new Date(2099, 11, 31), noInvalidDate: true })
    .map(
      (d) =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
          d.getDate(),
        ).padStart(2, '0')}`,
    )
  const offset = fc.integer({ min: -3650, max: 3650 })

  it('is invertible: add n then -n returns the original date', () => {
    fc.assert(
      fc.property(isoDate, offset, (date, n) => {
        expect(addDaysISO(addDaysISO(date, n), -n)).toBe(date)
      }),
    )
  })

  it('is additive: add(a) then add(b) equals add(a+b)', () => {
    fc.assert(
      fc.property(isoDate, offset, offset, (date, a, b) => {
        expect(addDaysISO(addDaysISO(date, a), b)).toBe(addDaysISO(date, a + b))
      }),
    )
  })
})

// ---------------------------------------------------------------------------
// Aging buckets — monotonic in days overdue
// ---------------------------------------------------------------------------
describe('agingBucket', () => {
  const TODAY = '2026-06-15'
  const idx = (overdueDays: number) =>
    AGING_BUCKETS.indexOf(agingBucket({ due_at: addDaysISO(TODAY, -overdueDays) }, TODAY))

  it('never decreases as an invoice gets more overdue', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 500 }),
        fc.integer({ min: 0, max: 500 }),
        (a, b) => {
          if (a <= b) expect(idx(a)).toBeLessThanOrEqual(idx(b))
        },
      ),
    )
  })

  it('treats a missing due date as current', () => {
    expect(agingBucket({ due_at: null }, TODAY)).toBe('current')
  })
})

// ---------------------------------------------------------------------------
// Recurrence — the client mirror of the materialize_jobs SQL engine
// ---------------------------------------------------------------------------
describe('occurrencesBetween', () => {
  const STEP: Record<Exclude<Cadence, 'monthly_day'>, number> = {
    weekly: 7,
    biweekly: 14,
    every_4_weeks: 28,
  }
  const isoDate = fc
    .date({ min: new Date(2020, 0, 1), max: new Date(2031, 11, 31), noInvalidDate: true })
    .map(
      (d) =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
          d.getDate(),
        ).padStart(2, '0')}`,
    )
  const daysBetween = (a: string, b: string) =>
    Math.round(
      (new Date(b + 'T00:00').getTime() - new Date(a + 'T00:00').getTime()) / 86_400_000,
    )
  const start = (anchor: string, from: string) => (anchor > from ? anchor : from)

  it('week cadences: strictly increasing, evenly spaced, within bounds', () => {
    fc.assert(
      fc.property(
        isoDate,
        fc.integer({ min: -30, max: 90 }),
        fc.integer({ min: 0, max: 400 }),
        fc.constantFrom<Cadence>('weekly', 'biweekly', 'every_4_weeks'),
        (anchor, fromOff, span, cadence) => {
          const from = addDaysISO(anchor, fromOff)
          const to = addDaysISO(from, span)
          const occ = occurrencesBetween({ cadence, anchor_date: anchor }, from, to)
          const lo = start(anchor, from)
          for (let i = 0; i < occ.length; i++) {
            expect(occ[i] >= lo).toBe(true)
            expect(occ[i] <= to).toBe(true)
            if (i > 0) {
              expect(occ[i] > occ[i - 1]).toBe(true)
              expect(daysBetween(occ[i - 1], occ[i])).toBe(
                STEP[cadence as keyof typeof STEP],
              )
            }
          }
        },
      ),
    )
  })

  it('monthly_day: clamped to the month length, increasing, within bounds', () => {
    fc.assert(
      fc.property(
        isoDate,
        fc.integer({ min: -30, max: 90 }),
        fc.integer({ min: 0, max: 730 }),
        fc.integer({ min: 1, max: 31 }),
        (anchor, fromOff, span, dom) => {
          const from = addDaysISO(anchor, fromOff)
          const to = addDaysISO(from, span)
          const occ = occurrencesBetween(
            { cadence: 'monthly_day', anchor_date: anchor, day_of_month: dom },
            from,
            to,
          )
          const lo = start(anchor, from)
          let prev = ''
          for (const d of occ) {
            expect(d >= lo).toBe(true) // exercises the d >= from && d >= anchor guard
            expect(d <= to).toBe(true)
            expect(d > prev).toBe(true)
            prev = d
            const [y, m, day] = d.split('-').map(Number)
            const daysInMonth = new Date(y, m, 0).getDate()
            expect(day).toBe(Math.min(dom, daysInMonth))
          }
        },
      ),
    )
  })
})
