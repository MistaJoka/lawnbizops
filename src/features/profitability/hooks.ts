import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { DateRange } from '@/features/reports/range'

export interface JobProfit {
  job_id: string
  title: string
  client_id: string | null
  revenue_cents: number
  /** Includes the labor leg (0047) — expenses + time-on-site at the org rate. */
  cost_cents: number
  labor_cents: number
  labor_minutes: number
  profit_cents: number
}

export interface ClientProfit {
  client_id: string
  name: string
  revenue_cents: number
  cost_cents: number
  profit_cents: number
}

/**
 * Ranked job profitability over a range. Revenue is BILLED (invoice_items on
 * non-void invoices) — payments aren't job-tagged, so a job can't be measured
 * on a collected basis.
 */
export function useJobProfitability(range: DateRange) {
  return useQuery({
    queryKey: ['profitability', 'jobs', range.start, range.end],
    queryFn: async (): Promise<JobProfit[]> => {
      const { data, error } = await supabase.rpc('job_profitability', {
        p_start: range.start,
        p_end: range.end,
      })
      if (error) throw error
      return (data ?? []) as JobProfit[]
    },
  })
}

/**
 * Ranked client profitability over a range. Revenue is COLLECTED (payments by
 * paid_at) — true cash-basis at the client level.
 */
export function useClientProfitability(range: DateRange) {
  return useQuery({
    queryKey: ['profitability', 'clients', range.start, range.end],
    queryFn: async (): Promise<ClientProfit[]> => {
      const { data, error } = await supabase.rpc('client_profitability', {
        p_start: range.start,
        p_end: range.end,
      })
      if (error) throw error
      return (data ?? []) as ClientProfit[]
    },
  })
}
