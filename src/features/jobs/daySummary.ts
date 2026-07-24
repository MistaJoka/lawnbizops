import { formatCentsShort } from '@/lib/format'
import { formatClockTime } from '@/lib/dates'
import type { Job } from './hooks'

/**
 * The Today header's thesis line: "6 stops · $905 booked · first at 8:00 AM".
 * The day in the operator's own terms, computed from the day's jobs. Segments
 * only appear when they have something true to say ($0 days don't announce
 * $0; a day with no times drops the third segment). Null on an empty day —
 * the empty state owns that moment.
 */
export function dayThesis(
  jobs: Pick<Job, 'status' | 'price_cents' | 'start_time'>[],
): string | null {
  // The day's real work: skipped/canceled stops are no longer part of the day.
  const stops = jobs.filter((j) => j.status !== 'skipped' && j.status !== 'canceled')
  if (stops.length === 0) return null

  const parts = [`${stops.length} stop${stops.length === 1 ? '' : 's'}`]

  const booked = stops.reduce((sum, j) => sum + j.price_cents, 0)
  if (booked > 0) parts.push(`${formatCentsShort(booked)} booked`)

  const remaining = stops.filter(
    (j) => j.status === 'scheduled' || j.status === 'in_progress',
  )
  if (remaining.length === 0) {
    parts.push('all wrapped')
  } else {
    const first = remaining
      .map((j) => j.start_time)
      .filter(Boolean)
      .sort()[0]
    if (first) parts.push(`first at ${formatClockTime(first)}`)
  }

  return parts.join(' · ')
}
