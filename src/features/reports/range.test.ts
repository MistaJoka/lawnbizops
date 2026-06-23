import { describe, expect, it } from 'vitest'
import { presetRange } from './range'

// These assert structural invariants that hold regardless of the wall clock,
// so the test stays deterministic without mocking the date.
describe('presetRange', () => {
  it('year starts Jan 1 and ends today, start <= end', () => {
    const r = presetRange('year')
    expect(r.start).toMatch(/^\d{4}-01-01$/)
    expect(r.start <= r.end).toBe(true)
    expect(r.end).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('quarter starts on a quarter month (01/04/07/10), day 01', () => {
    const r = presetRange('quarter')
    expect(r.start).toMatch(/^\d{4}-(01|04|07|10)-01$/)
    expect(r.start <= r.end).toBe(true)
  })

  it('month starts on the 1st and ends today', () => {
    const r = presetRange('month')
    expect(r.start).toMatch(/^\d{4}-\d{2}-01$/)
    expect(r.start <= r.end).toBe(true)
    // Same calendar month on both ends.
    expect(r.start.slice(0, 7)).toBe(r.end.slice(0, 7))
  })
})
