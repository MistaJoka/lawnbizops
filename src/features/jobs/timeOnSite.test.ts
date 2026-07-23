import { describe, expect, it } from 'vitest'
import { formatMinutes, laborCostCents, timeOnSiteMinutes } from './timeOnSite'

// Time-on-site is the field half of job costing (audit C4): duration comes
// from the started_at/completed_at stamps, labor cost from the org's hourly
// rate. Money stays integer cents; rounding to whole minutes/cents at the edge.

describe('timeOnSiteMinutes', () => {
  it('measures whole minutes between start and completion', () => {
    expect(timeOnSiteMinutes('2026-07-23T09:00:00Z', '2026-07-23T10:45:00Z')).toBe(105)
  })

  it('rounds partial minutes instead of truncating', () => {
    expect(timeOnSiteMinutes('2026-07-23T09:00:00Z', '2026-07-23T09:30:31Z')).toBe(31)
  })

  it('is null without both stamps', () => {
    expect(timeOnSiteMinutes(null, '2026-07-23T10:00:00Z')).toBeNull()
    expect(timeOnSiteMinutes('2026-07-23T09:00:00Z', null)).toBeNull()
    expect(timeOnSiteMinutes(null, null)).toBeNull()
  })

  it('is null for a negative window (clock skew or bad data, never trusted)', () => {
    expect(timeOnSiteMinutes('2026-07-23T11:00:00Z', '2026-07-23T10:00:00Z')).toBeNull()
  })
})

describe('laborCostCents', () => {
  it('prices minutes at the hourly rate ($45/hr for 105m = $78.75)', () => {
    expect(laborCostCents(105, 4500)).toBe(7875)
  })

  it('rounds to whole cents (50m at $35/hr = 2916.67 → 2917)', () => {
    expect(laborCostCents(50, 3500)).toBe(2917)
  })

  it('is zero when the rate is unset — labor costing off by default', () => {
    expect(laborCostCents(105, 0)).toBe(0)
  })

  it('is zero for zero or null minutes', () => {
    expect(laborCostCents(0, 4500)).toBe(0)
    expect(laborCostCents(null, 4500)).toBe(0)
  })
})

describe('formatMinutes', () => {
  it('reads hours and minutes for the detail chip', () => {
    expect(formatMinutes(105)).toBe('1h 45m')
    expect(formatMinutes(60)).toBe('1h')
    expect(formatMinutes(45)).toBe('45m')
    expect(formatMinutes(0)).toBe('0m')
  })
})
