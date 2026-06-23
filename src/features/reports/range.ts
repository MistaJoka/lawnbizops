import { localToday } from '@/lib/format'
import { parseLocalDate } from '@/lib/dates'

export interface DateRange {
  start: string
  end: string
}

export type RangePreset = 'month' | 'quarter' | 'year' | 'custom'

/** Period-to-date ranges from device-local today (never UTC). */
export function presetRange(preset: Exclude<RangePreset, 'custom'>): DateRange {
  const today = localToday()
  const d = parseLocalDate(today)
  const y = d.getFullYear()
  const pad = (n: number) => String(n).padStart(2, '0')
  if (preset === 'year') return { start: `${y}-01-01`, end: today }
  if (preset === 'quarter') {
    const qStartMonth = Math.floor(d.getMonth() / 3) * 3 // 0, 3, 6, 9
    return { start: `${y}-${pad(qStartMonth + 1)}-01`, end: today }
  }
  return { start: `${y}-${pad(d.getMonth() + 1)}-01`, end: today }
}

/** The default report window — this month to date. */
export function thisMonthRange(): DateRange {
  return presetRange('month')
}
