import { describe, expect, it } from 'vitest'
import { nextOccurrences, occurrencesBetween } from './recurrence'

// These expected sequences were verified against the materialize_jobs SQL
// function on the live database (2026-06-10). Keep both engines in sync.
describe('occurrencesBetween', () => {
  it('biweekly from anchor matches the SQL engine', () => {
    expect(
      occurrencesBetween(
        { cadence: 'biweekly', anchor_date: '2026-06-04' },
        '2026-06-01',
        '2026-08-04',
      ),
    ).toEqual(['2026-06-04', '2026-06-18', '2026-07-02', '2026-07-16', '2026-07-30'])
  })

  it('monthly day-31 clamps to short months, matching the SQL engine', () => {
    expect(
      occurrencesBetween(
        { cadence: 'monthly_day', anchor_date: '2026-05-31', day_of_month: 31 },
        '2026-05-01',
        '2026-08-04',
      ),
    ).toEqual(['2026-05-31', '2026-06-30', '2026-07-31'])
  })

  it('weekly aligns forward when window starts after anchor', () => {
    expect(
      occurrencesBetween(
        { cadence: 'weekly', anchor_date: '2026-06-04' },
        '2026-06-10',
        '2026-06-30',
      ),
    ).toEqual(['2026-06-11', '2026-06-18', '2026-06-25'])
  })

  it('starts at anchor when window begins before it', () => {
    expect(
      occurrencesBetween(
        { cadence: 'every_4_weeks', anchor_date: '2026-07-01' },
        '2026-06-01',
        '2026-09-01',
      ),
    ).toEqual(['2026-07-01', '2026-07-29', '2026-08-26'])
  })

  it('respects ends_on', () => {
    expect(
      occurrencesBetween(
        { cadence: 'weekly', anchor_date: '2026-06-04', ends_on: '2026-06-18' },
        '2026-06-01',
        '2026-12-31',
      ),
    ).toEqual(['2026-06-04', '2026-06-11', '2026-06-18'])
  })

  it('caps at the window end when ends_on is beyond it', () => {
    expect(
      occurrencesBetween(
        { cadence: 'weekly', anchor_date: '2026-06-01', ends_on: '2026-12-31' },
        '2026-06-01',
        '2026-06-15',
      ),
    ).toEqual(['2026-06-01', '2026-06-08', '2026-06-15'])
  })

  it('includes a monthly occurrence landing exactly on the window end', () => {
    expect(
      occurrencesBetween(
        { cadence: 'monthly_day', anchor_date: '2026-01-15', day_of_month: 15 },
        '2026-05-01',
        '2026-06-15',
      ),
    ).toEqual(['2026-05-15', '2026-06-15'])
  })

  it('skips a monthly day that already passed inside the from-month', () => {
    expect(
      occurrencesBetween(
        { cadence: 'monthly_day', anchor_date: '2026-01-05', day_of_month: 5 },
        '2026-06-10',
        '2026-08-31',
      ),
    ).toEqual(['2026-07-05', '2026-08-05'])
  })

  it('starts at anchor when the window begins exactly one step before it', () => {
    expect(
      occurrencesBetween(
        { cadence: 'weekly', anchor_date: '2026-06-08' },
        '2026-06-01',
        '2026-06-22',
      ),
    ).toEqual(['2026-06-08', '2026-06-15', '2026-06-22'])
  })

  it('returns empty for monthly_day without day_of_month', () => {
    expect(
      occurrencesBetween(
        { cadence: 'monthly_day', anchor_date: '2026-06-01' },
        '2026-06-01',
        '2026-12-31',
      ),
    ).toEqual([])
  })
})

describe('nextOccurrences', () => {
  it('returns the next N dates for the editor preview', () => {
    expect(
      nextOccurrences(
        { cadence: 'biweekly', anchor_date: '2026-06-04' },
        '2026-06-10',
        4,
      ),
    ).toEqual(['2026-06-18', '2026-07-02', '2026-07-16', '2026-07-30'])
  })
  it('looks two full years out — a monthly preview of 12 never comes up short', () => {
    expect(
      nextOccurrences(
        { cadence: 'monthly_day', anchor_date: '2026-01-01', day_of_month: 1 },
        '2026-07-23',
        12,
      ),
    ).toHaveLength(12)
  })
})
