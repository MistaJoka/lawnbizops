import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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
  it('rejects partial matches — the whole string must be a clock time', () => {
    expect(formatClockTime('9:30 pm')).toBe('') // trailing junk
    expect(formatClockTime('x19:30')).toBe('') // leading junk
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

describe('relativeTime unit boundaries (frozen clock)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-23T12:00:00'))
  })
  afterEach(() => vi.useRealTimers())

  const agoSec = (s: number) =>
    relativeTime(new Date(Date.now() - s * 1000).toISOString())

  it('flips just-now → minutes at exactly 45s', () => {
    expect(agoSec(44)).toBe('just now')
    expect(agoSec(45)).toBe('1m ago')
  })
  it('flips minutes → hours at exactly 60m', () => {
    expect(agoSec(59 * 60)).toBe('59m ago')
    expect(agoSec(60 * 60)).toBe('1h ago')
  })
  it('flips hours → days at exactly 24h', () => {
    expect(agoSec(23 * 3600)).toBe('23h ago')
    expect(agoSec(24 * 3600)).toBe('1d ago')
  })
})

describe('materializeHorizon', () => {
  it('is 182 days (~6 months) past local today', () => {
    expect(materializeHorizon()).toBe(addDaysISO(localToday(), 182))
  })
})
