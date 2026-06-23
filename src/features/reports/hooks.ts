import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { DateRange } from './range'

export interface Pnl {
  income_cents: number
  expense_cents: number
  net_cents: number
}

export interface CategoryTotal {
  category: string
  total_cents: number
}

export interface MethodTotal {
  method: string
  total_cents: number
}

/** Cash-basis P&L: income (payments) − expenses, over the range. */
export function usePnl(range: DateRange) {
  return useQuery({
    queryKey: ['reports', 'pnl', range.start, range.end],
    queryFn: async (): Promise<Pnl> => {
      const { data, error } = await supabase.rpc('pnl_summary', {
        p_start: range.start,
        p_end: range.end,
      })
      if (error) throw error
      const row = Array.isArray(data) ? data[0] : data
      return (row as Pnl) ?? { income_cents: 0, expense_cents: 0, net_cents: 0 }
    },
  })
}

export function useExpensesByCategory(range: DateRange) {
  return useQuery({
    queryKey: ['reports', 'expenses_by_category', range.start, range.end],
    queryFn: async (): Promise<CategoryTotal[]> => {
      const { data, error } = await supabase.rpc('expenses_by_category', {
        p_start: range.start,
        p_end: range.end,
      })
      if (error) throw error
      return (data ?? []) as CategoryTotal[]
    },
  })
}

export function useIncomeByMethod(range: DateRange) {
  return useQuery({
    queryKey: ['reports', 'income_by_method', range.start, range.end],
    queryFn: async (): Promise<MethodTotal[]> => {
      const { data, error } = await supabase.rpc('income_by_method', {
        p_start: range.start,
        p_end: range.end,
      })
      if (error) throw error
      return (data ?? []) as MethodTotal[]
    },
  })
}
