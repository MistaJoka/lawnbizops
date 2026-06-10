import { describe, expect, it } from 'vitest'
import { csvField, toCsv } from './csv'

describe('csvField', () => {
  it('passes plain values through unquoted', () => {
    expect(csvField('Walt Pierce')).toBe('Walt Pierce')
    expect(csvField(4500)).toBe('4500')
    expect(csvField(true)).toBe('true')
  })
  it('renders null and undefined as empty', () => {
    expect(csvField(null)).toBe('')
    expect(csvField(undefined)).toBe('')
  })
  it('quotes fields containing commas', () => {
    expect(csvField('mow, edge, blow')).toBe('"mow, edge, blow"')
  })
  it('quotes and doubles embedded quotes', () => {
    expect(csvField('the "big" yard')).toBe('"the ""big"" yard"')
  })
  it('quotes fields containing newlines', () => {
    expect(csvField('line one\nline two')).toBe('"line one\nline two"')
    expect(csvField('a\r\nb')).toBe('"a\r\nb"')
  })
  it('serializes objects as JSON (quoted — JSON has commas/quotes)', () => {
    expect(csvField({ a: 1 })).toBe('"{""a"":1}"')
  })
})

describe('toCsv', () => {
  it('returns empty string for no rows', () => {
    expect(toCsv([])).toBe('')
  })
  it('builds a header row from the first row keys', () => {
    const csv = toCsv([
      { name: 'Walt', phone: '555-0100' },
      { name: 'Ana', phone: '555-0101' },
    ])
    expect(csv).toBe('name,phone\r\nWalt,555-0100\r\nAna,555-0101\r\n')
  })
  it('escapes tricky fields in data rows', () => {
    const csv = toCsv([{ note: 'call "before" 8am, not after', count: null }])
    expect(csv).toBe('note,count\r\n"call ""before"" 8am, not after",\r\n')
  })
})
