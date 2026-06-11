import { describe, expect, it } from 'vitest'
import {
  bagsNeeded,
  mulchVolumeCubicYards,
  slopePercentFromPitchRad,
} from './calculators'

describe('mulchVolumeCubicYards', () => {
  it('converts area and depth to cubic yards', () => {
    // 270 sq ft × 3 in = 67.5 cu ft = 2.5 cu yd
    expect(mulchVolumeCubicYards(270, 3)).toBeCloseTo(2.5, 2)
  })
  it('returns 0 for zero or negative inputs', () => {
    expect(mulchVolumeCubicYards(0, 3)).toBe(0)
    expect(mulchVolumeCubicYards(270, 0)).toBe(0)
    expect(mulchVolumeCubicYards(-100, 3)).toBe(0)
    expect(mulchVolumeCubicYards(270, -2)).toBe(0)
  })
})

describe('bagsNeeded', () => {
  it('rounds up bag count', () => {
    expect(bagsNeeded(2.5)).toBe(34)
  })
  it('respects custom bag size', () => {
    // 1 cu yd = 27 cu ft → nine 3-cu-ft bags
    expect(bagsNeeded(1, 3)).toBe(9)
  })
  it('returns 0 for zero or negative volume', () => {
    expect(bagsNeeded(0)).toBe(0)
    expect(bagsNeeded(-1)).toBe(0)
  })
})

describe('slopePercentFromPitchRad', () => {
  it('is 0% on flat ground', () => {
    expect(slopePercentFromPitchRad(0)).toBe(0)
  })
  it('is 100% at 45 degrees', () => {
    expect(slopePercentFromPitchRad(Math.PI / 4)).toBeCloseTo(100, 6)
  })
  it('matches tan for a typical drainage grade (~2%)', () => {
    expect(slopePercentFromPitchRad(Math.atan(0.02))).toBeCloseTo(2, 6)
  })
  it('is negative for a downhill pitch', () => {
    expect(slopePercentFromPitchRad(-Math.PI / 4)).toBeCloseTo(-100, 6)
  })
})
