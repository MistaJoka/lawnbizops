import { describe, expect, it } from 'vitest'
import { addDaysISO, formatClockTime } from './dates'

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
