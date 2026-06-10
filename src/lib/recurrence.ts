/**
 * Client-side mirror of the materialize_jobs SQL engine, used ONLY for
 * "next N dates" previews in the schedule editor. The database function is
 * the source of truth — keep the two in sync (both tested against the same
 * expected sequences).
 */

export type Cadence = 'weekly' | 'biweekly' | 'every_4_weeks' | 'monthly_day'

export interface RecurrenceRule {
  cadence: Cadence
  /** First occurrence (YYYY-MM-DD). Week cadences derive weekday from it. */
  anchor_date: string
  /** Required for monthly_day. */
  day_of_month?: number | null
  ends_on?: string | null
}

const STEP_DAYS: Record<Exclude<Cadence, 'monthly_day'>, number> = {
  weekly: 7,
  biweekly: 14,
  every_4_weeks: 28,
}

function parseDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function fmt(d: Date): string {
  const y = d.getFullYear()
  const m = (d.getMonth() + 1).toString().padStart(2, '0')
  const day = d.getDate().toString().padStart(2, '0')
  return `${y}-${m}-${day}`
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d)
  out.setDate(out.getDate() + n)
  return out
}

/** Occurrence dates (YYYY-MM-DD) in [from, to], inclusive, capped at `limit`. */
export function occurrencesBetween(
  rule: RecurrenceRule,
  from: string,
  to: string,
  limit = 100,
): string[] {
  const anchor = parseDate(rule.anchor_date)
  const fromD = parseDate(from) < anchor ? anchor : parseDate(from)
  const endD =
    rule.ends_on && parseDate(rule.ends_on) < parseDate(to)
      ? parseDate(rule.ends_on)
      : parseDate(to)
  const out: string[] = []

  if (rule.cadence === 'monthly_day') {
    const dom = rule.day_of_month
    if (!dom) return []
    const cursor = new Date(fromD.getFullYear(), fromD.getMonth(), 1)
    while (out.length < limit) {
      const daysInMonth = new Date(
        cursor.getFullYear(),
        cursor.getMonth() + 1,
        0,
      ).getDate()
      const d = new Date(
        cursor.getFullYear(),
        cursor.getMonth(),
        Math.min(dom, daysInMonth),
      )
      if (d > endD) break
      if (d >= fromD && d >= anchor) out.push(fmt(d))
      cursor.setMonth(cursor.getMonth() + 1)
    }
    return out
  }

  const step = STEP_DAYS[rule.cadence]
  const diffDays = Math.round((fromD.getTime() - anchor.getTime()) / 86_400_000)
  let d = diffDays <= 0 ? anchor : addDays(anchor, Math.ceil(diffDays / step) * step)
  while (d <= endD && out.length < limit) {
    out.push(fmt(d))
    d = addDays(d, step)
  }
  return out
}

/** The next N occurrences on/after `from` — schedule editor preview. */
export function nextOccurrences(rule: RecurrenceRule, from: string, n: number): string[] {
  const horizon = addDays(parseDate(from), 366 * 2)
  return occurrencesBetween(rule, from, fmt(horizon), n)
}
