import { localToday } from './format'

/** Parse a YYYY-MM-DD string as a device-local Date (never UTC midnight). */
export function parseLocalDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function fmtDate(d: Date): string {
  const y = d.getFullYear()
  const m = (d.getMonth() + 1).toString().padStart(2, '0')
  const day = d.getDate().toString().padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Add days to a YYYY-MM-DD string, returning YYYY-MM-DD. */
export function addDaysISO(date: string, days: number): string {
  const d = parseLocalDate(date)
  d.setDate(d.getDate() + days)
  return fmtDate(d)
}

/** Materialization horizon — 8 weeks out from the device-local today. */
export function materializeHorizon(): string {
  return addDaysISO(localToday(), 56)
}

/** "Thu Jun 18" from a YYYY-MM-DD string. */
export function formatShortDate(date: string): string {
  return parseLocalDate(date)
    .toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    .replace(/,/g, '')
}

/** "2:30 PM" from an HH:MM input-time string; empty/invalid passes through as ''. */
export function formatClockTime(t: string): string {
  const match = /^(\d{1,2}):(\d{2})$/.exec(t)
  if (!match) return ''
  const h = Number(match[1])
  const suffix = h >= 12 ? 'PM' : 'AM'
  const hour12 = h % 12 === 0 ? 12 : h % 12
  return `${hour12}:${match[2]} ${suffix}`
}
