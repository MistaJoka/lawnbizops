import { describe, expect, it } from 'vitest'
import {
  addDaysISO,
  formatClockTime,
  formatShortDate,
  materializeHorizon,
  relativeTime,
} from './dates'
import { localToday } from './format'

describe('formatClockTime', () => {
  it('formats afternoon times', () => {
    expect(formatClockTime('14:30')).toBe('2:30 PM')
  })
  it('formats morning times', () => {
    expect(formatClockTime('07:05')).toBe('7:05 AM')
  })
  it('handles midnight and noon', () => {
    expect(formatClockTime('00:00')).toBe('12:00 AM')
    expect(formatClockTime('12:00')).toBe('12:00 PM')
  })
  it('passes empty/invalid through as empty', () => {
    expect(formatClockTime('')).toBe('')
    expect(formatClockTime('garbage')).toBe('')
  })
})

describe('addDaysISO', () => {
  it('rolls over month boundaries on local dates', () => {
    expect(addDaysISO('2026-06-28', 5)).toBe('2026-07-03')
  })
  it('handles leap-year February', () => {
    expect(addDaysISO('2028-02-28', 1)).toBe('2028-02-29')
  })
})

describe('formatShortDate', () => {
  it('formats a YYYY-MM-DD as "Wkd Mon D" with no commas', () => {
    // 2026-06-18 is a Thursday in local time.
    expect(formatShortDate('2026-06-18')).toBe('Thu Jun 18')
  })
})

describe('relativeTime', () => {
  it('reads "just now" for a moment ago and empty for garbage', () => {
    expect(relativeTime(new Date(Date.now() - 1000).toISOString())).toBe('just now')
    expect(relativeTime('not-a-date')).toBe('')
  })
  it('reports hours for an earlier-today timestamp', () => {
    expect(relativeTime(new Date(Date.now() - 3 * 3600 * 1000).toISOString())).toMatch(
      /^\d+h ago$/,
    )
  })
})

describe('materializeHorizon', () => {
  it('is 56 days past local today', () => {
    expect(materializeHorizon()).toBe(addDaysISO(localToday(), 56))
  })
})
