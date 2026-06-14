import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { localToday } from '@/lib/format'
import { addDaysISO, parseLocalDate } from '@/lib/dates'

export interface DashboardMetrics {
  collected_cents: number
  outstanding_cents: number
  pipeline_cents: number
  jobs_week: number
  jobs_done_week: number
  open_tasks: number
  overdue_tasks: number
  leads: number
  quoted: number
  active: number
  dormant: number
}

/** Local-time boundaries for "this month" and "this week" (Sun–Sat). */
function boundaries() {
  const today = localToday()
  const d = parseLocalDate(today)
  const monthStart = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
  const weekStart = addDaysISO(today, -d.getDay())
  const weekEnd = addDaysISO(weekStart, 6)
  return { today, monthStart, weekStart, weekEnd }
}

export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard', localToday()],
    queryFn: async (): Promise<DashboardMetrics | null> => {
      const b = boundaries()
      const { data, error } = await supabase.rpc('dashboard_metrics', {
        p_today: b.today,
        p_month_start: b.monthStart,
        p_week_start: b.weekStart,
        p_week_end: b.weekEnd,
      })
      if (error) throw error
      const row = Array.isArray(data) ? data[0] : data
      return (row as DashboardMetrics) ?? null
    },
  })
}
