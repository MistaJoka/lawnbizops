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

/**
 * Materialization horizon — ~6 months out from the device-local today.
 * materialize_jobs is incremental (it resumes from last_materialized_through),
 * so the once-per-session on-load call keeps every schedule topped up to this;
 * migration 0038 moves the nightly pg_cron sweep to the same 182 days.
 */
export function materializeHorizon(): string {
  return addDaysISO(localToday(), 182)
}

/** "Thu Jun 18" from a YYYY-MM-DD string. */
export function formatShortDate(date: string): string {
  return parseLocalDate(date)
    .toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    .replace(/,/g, '')
}

/** Short relative time ("just now", "5m ago", "2d ago") from an ISO timestamp. */
export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const diffSec = Math.round((Date.now() - then) / 1000)
  if (diffSec < 45) return 'just now'
  const diffMin = Math.round(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.round(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDay = Math.round(diffHr / 24)
  if (diffDay < 7) return `${diffDay}d ago`
  const diffWk = Math.round(diffDay / 7)
  if (diffWk < 5) return `${diffWk}w ago`
  return formatShortDate(fmtDate(new Date(then)))
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
