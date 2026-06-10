/** Money lives as integer cents everywhere; formatting happens only at the edge. */
export function formatCents(cents: number): string {
  const sign = cents < 0 ? '-' : ''
  const abs = Math.abs(cents)
  const dollars = Math.floor(abs / 100)
  const remainder = abs % 100
  return `${sign}$${dollars.toLocaleString('en-US')}.${remainder.toString().padStart(2, '0')}`
}

/** Parse a user-typed dollar amount ("45", "45.5", "$1,200.00") into cents, or null if invalid. */
export function parseDollarsToCents(input: string): number | null {
  const cleaned = input.replace(/[$,\s]/g, '')
  if (!/^-?\d*(\.\d{0,2})?$/.test(cleaned) || cleaned === '' || cleaned === '-') {
    return null
  }
  return Math.round(parseFloat(cleaned) * 100)
}

/** Local-device date as YYYY-MM-DD. Never UTC — evening use must not roll the day. */
export function localToday(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = (d.getMonth() + 1).toString().padStart(2, '0')
  const day = d.getDate().toString().padStart(2, '0')
  return `${y}-${m}-${day}`
}
