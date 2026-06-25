import { describe, expect, it } from 'vitest'
import { formatCents, parseDollarsToCents, shortAgo } from './format'

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
})
