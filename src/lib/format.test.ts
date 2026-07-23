import { describe, expect, it, vi } from 'vitest'
import {
  formatCents,
  formatCentsShort,
  localToday,
  parseDollarsToCents,
  shortAgo,
} from './format'

describe('localToday', () => {
  it('renders the device-local date zero-padded (frozen clock)', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 0, 5)) // Jan 5, local
    expect(localToday()).toBe('2026-01-05')
    vi.useRealTimers()
  })
})

describe('formatCents', () => {
  it('formats whole dollars', () => {
    expect(formatCents(4500)).toBe('$45.00')
  })
  it('formats cents remainder', () => {
    expect(formatCents(4505)).toBe('$45.05')
  })
  it('formats zero', () => {
    expect(formatCents(0)).toBe('$0.00')
  })
  it('formats thousands with separators', () => {
    expect(formatCents(123456789)).toBe('$1,234,567.89')
  })
  it('formats negatives', () => {
    expect(formatCents(-2550)).toBe('-$25.50')
  })
})

describe('formatCentsShort', () => {
  it('shows whole dollars under $1k', () => {
    expect(formatCentsShort(6500)).toBe('$65')
    expect(formatCentsShort(12000)).toBe('$120')
    expect(formatCentsShort(0)).toBe('$0')
  })
  it('abbreviates thousands with one decimal', () => {
    expect(formatCentsShort(840000)).toBe('$8.4k')
    expect(formatCentsShort(120000)).toBe('$1.2k')
  })
  it('drops the decimal at $10k+', () => {
    expect(formatCentsShort(1200000)).toBe('$12k')
  })
  it('rounds to whole dollars', () => {
    expect(formatCentsShort(6549)).toBe('$65')
    expect(formatCentsShort(6550)).toBe('$66')
  })
  it('handles negatives', () => {
    expect(formatCentsShort(-840000)).toBe('-$8.4k')
  })
  it('switches format exactly at $1k and $10k', () => {
    expect(formatCentsShort(99900)).toBe('$999')
    expect(formatCentsShort(100000)).toBe('$1.0k')
    expect(formatCentsShort(999900)).toBe('$10.0k') // still one decimal at 9,999
    expect(formatCentsShort(1000000)).toBe('$10k')
  })
})

describe('parseDollarsToCents', () => {
  it('parses plain dollars', () => {
    expect(parseDollarsToCents('45')).toBe(4500)
  })
  it('parses decimals', () => {
    expect(parseDollarsToCents('45.5')).toBe(4550)
  })
  it('parses currency formatting', () => {
    expect(parseDollarsToCents('$1,200.00')).toBe(120000)
  })
  it('rejects garbage', () => {
    expect(parseDollarsToCents('abc')).toBeNull()
    expect(parseDollarsToCents('')).toBeNull()
    expect(parseDollarsToCents('1.2.3')).toBeNull()
  })
  it('rejects inputs that clean down to nothing or a bare sign', () => {
    expect(parseDollarsToCents('$')).toBeNull()
    expect(parseDollarsToCents('$ ,')).toBeNull()
    expect(parseDollarsToCents('-')).toBeNull()
    expect(parseDollarsToCents('1.234')).toBeNull() // 3 decimals is not money
  })
})

describe('shortAgo', () => {
  const now = Date.UTC(2026, 5, 24, 12, 0, 0) // fixed reference

  it('reads "now" under a minute', () => {
    expect(shortAgo(now - 30_000, now)).toBe('now')
  })
  it('clamps future/skewed timestamps to "now"', () => {
    expect(shortAgo(now + 5_000, now)).toBe('now')
  })
  it('shows whole minutes under an hour', () => {
    expect(shortAgo(now - 2 * 60_000, now)).toBe('2m')
    expect(shortAgo(now - 59 * 60_000, now)).toBe('59m')
  })
  it('shows whole hours under a day', () => {
    expect(shortAgo(now - 3 * 3_600_000, now)).toBe('3h')
  })
  it('falls back to an absolute short date past a day', () => {
    // 2 days earlier → "Jun 22" in the local timezone of the test runner.
    const out = shortAgo(now - 2 * 86_400_000, now)
    expect(out).toMatch(/^[A-Z][a-z]{2} \d{1,2}$/)
  })
  it('flips units exactly at 1m, 1h, and 1d', () => {
    expect(shortAgo(now - 59_999, now)).toBe('now')
    expect(shortAgo(now - 60_000, now)).toBe('1m')
    expect(shortAgo(now - 3_599_999, now)).toBe('59m')
    expect(shortAgo(now - 3_600_000, now)).toBe('1h')
    expect(shortAgo(now - 86_399_999, now)).toBe('23h')
    expect(shortAgo(now - 86_400_000, now)).toMatch(/^[A-Z][a-z]{2} \d{1,2}$/)
  })
})
