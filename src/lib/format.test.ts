import { describe, expect, it } from 'vitest'
import { formatCents, parseDollarsToCents } from './format'

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
