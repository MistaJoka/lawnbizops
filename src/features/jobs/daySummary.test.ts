import { describe, expect, it } from 'vitest'
import { dayThesis } from './daySummary'

// The Today header's thesis line — the day at a glance, in the operator's own
// terms: how many stops, how much money is on the books, when the first cut
// starts. Built from the day's job list; segments drop out when they have
// nothing true to say.

const job = (over: Record<string, unknown>) =>
  ({ status: 'scheduled', price_cents: 0, start_time: '', ...over }) as never

describe('dayThesis', () => {
  it('reads stops · booked · first start for a fresh morning', () => {
    expect(
      dayThesis([
        job({ price_cents: 6500, start_time: '08:00' }),
        job({ price_cents: 12000, start_time: '10:30' }),
        job({ price_cents: 8000, start_time: '09:15' }),
      ]),
    ).toBe('3 stops · $265 booked · first at 8:00 AM')
  })

  it('uses the singular for a one-stop day', () => {
    expect(dayThesis([job({ price_cents: 6500, start_time: '08:00' })])).toBe(
      '1 stop · $65 booked · first at 8:00 AM',
    )
  })

  it('says all wrapped once every stop is finished', () => {
    expect(
      dayThesis([
        job({ status: 'done', price_cents: 6500 }),
        job({ status: 'invoiced', price_cents: 8000 }),
      ]),
    ).toBe('2 stops · $145 booked · all wrapped')
  })

  it('drops the first-start segment when no remaining stop has a time', () => {
    expect(dayThesis([job({ price_cents: 6500 })])).toBe('1 stop · $65 booked')
  })

  it('takes the first start from stops still to do, not finished ones', () => {
    expect(
      dayThesis([
        job({ status: 'done', price_cents: 5000, start_time: '07:00' }),
        job({ price_cents: 6500, start_time: '09:00' }),
      ]),
    ).toBe('2 stops · $115 booked · first at 9:00 AM')
  })

  it('ignores skipped and canceled jobs entirely', () => {
    expect(
      dayThesis([
        job({ status: 'skipped', price_cents: 9999 }),
        job({ status: 'canceled', price_cents: 9999 }),
        job({ price_cents: 6500, start_time: '08:00' }),
      ]),
    ).toBe('1 stop · $65 booked · first at 8:00 AM')
  })

  it('drops the money segment on a $0 day instead of announcing $0', () => {
    expect(dayThesis([job({ start_time: '08:00' })])).toBe('1 stop · first at 8:00 AM')
  })

  it('is null when the day has no stops (the empty state speaks instead)', () => {
    expect(dayThesis([])).toBeNull()
    expect(dayThesis([job({ status: 'canceled' })])).toBeNull()
  })
})
