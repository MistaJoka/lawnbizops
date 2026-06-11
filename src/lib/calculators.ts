/** Cubic yards from area (sq ft) × depth (inches). */
export function mulchVolumeCubicYards(areaSqFt: number, depthInches: number): number {
  if (areaSqFt <= 0 || depthInches <= 0) return 0
  const cubicFeet = areaSqFt * (depthInches / 12)
  return cubicFeet / 27
}

/** Bags needed at a given cu ft per bag (typical mulch bag ≈ 2 cu ft). */
export function bagsNeeded(cubicYards: number, cuFtPerBag = 2): number {
  if (cubicYards <= 0) return 0
  const cubicFeet = cubicYards * 27
  return Math.ceil(cubicFeet / cuFtPerBag)
}

/** Slope percent from device pitch (radians). */
export function slopePercentFromPitchRad(pitchRad: number): number {
  return Math.tan(pitchRad) * 100
}
