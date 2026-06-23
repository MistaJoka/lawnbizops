import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryClient } from '@/lib/queryClient'
import { enqueue } from '@/lib/outbox'
import { confirmToast } from '@/lib/toast'
import { localToday } from '@/lib/format'
import { parseLocalDate } from '@/lib/dates'
import type { Tables } from '@/lib/database.types'

export type Expense = Tables<'expenses'>

export type ExpenseMethod = 'cash' | 'check' | 'card' | 'transfer' | 'other'

export const EXPENSE_METHODS: { value: ExpenseMethod; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'check', label: 'Check' },
  { value: 'card', label: 'Card' },
  { value: 'transfer', label: 'Transfer' },
  { value: 'other', label: 'Other' },
]

/** A list/detail row, joined with the optional client name and job title. */
export interface ExpenseRow extends Expense {
  client: { name: string } | null
  job: { title: string } | null
}

const SELECT = '*, client:clients(name), job:jobs(title)'

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

/** Shared so a route loader can warm the list on tab-intent (preload). */
export const expensesQueryOptions = {
  queryKey: ['expenses'] as const,
  queryFn: async (): Promise<ExpenseRow[]> => {
    const { data, error } = await supabase
      .from('expenses')
      .select(SELECT)
      .order('spent_on', { ascending: false })
    if (error) throw error
    return data as unknown as ExpenseRow[]
  },
}

export function useExpenses() {
  return useQuery(expensesQueryOptions)
}

export function useExpense(id: string) {
  return useQuery({
    queryKey: ['expenses', id],
    queryFn: async (): Promise<ExpenseRow> => {
      const { data, error } = await supabase
        .from('expenses')
        .select(SELECT)
        .eq('id', id)
        .single()
      if (error) throw error
      return data as unknown as ExpenseRow
    },
  })
}

/** Costs tagged to a job — the cost side of job profitability (Phase 2). */
export function useExpensesForJob(jobId: string) {
  return useQuery({
    queryKey: ['expenses', { jobId }],
    enabled: jobId !== '',
    queryFn: async (): Promise<Expense[]> => {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('job_id', jobId)
        .order('spent_on', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

/** Costs tagged to a client — the cost side of client profitability (Phase 2). */
export function useExpensesForClient(clientId: string) {
  return useQuery({
    queryKey: ['expenses', { clientId }],
    enabled: clientId !== '',
    queryFn: async (): Promise<Expense[]> => {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('client_id', clientId)
        .order('spent_on', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

/** Sum of expense amounts in the given local-date month (YYYY-MM). */
export function monthExpenseCents(
  expenses: Expense[] | undefined,
  month: string,
): number {
  return (expenses ?? [])
    .filter((e) => e.spent_on.startsWith(month))
    .reduce((sum, e) => sum + e.amount_cents, 0)
}

// ---------------------------------------------------------------------------
// Writes (optimistic cache + outbox)
// ---------------------------------------------------------------------------

export interface CreateExpenseInput {
  category: string
  amountCents: number
  spentOn: string
  vendor: string
  note: string
  paymentMethod: ExpenseMethod
  jobId: string | null
  clientId: string | null
  payeeId?: string | null
  /** Display names for the optimistic row (so it reads right offline). */
  clientName?: string | null
  jobTitle?: string | null
}

export async function createExpense(input: CreateExpenseInput): Promise<string> {
  const id = crypto.randomUUID()
  const now = new Date().toISOString()

  const row = {
    id,
    category: input.category,
    amount_cents: input.amountCents,
    spent_on: input.spentOn,
    vendor: input.vendor,
    note: input.note,
    payment_method: input.paymentMethod,
    job_id: input.jobId,
    client_id: input.clientId,
    payee_id: input.payeeId ?? null,
  }

  const cached: ExpenseRow = {
    ...row,
    created_at: now,
    updated_at: now,
    user_id: '',
    org_id: '',
    client: input.clientName ? { name: input.clientName } : null,
    job: input.jobTitle ? { title: input.jobTitle } : null,
  }
  queryClient.setQueryData<ExpenseRow[]>(['expenses'], (old) =>
    old ? [cached, ...old] : [cached],
  )
  queryClient.setQueryData<ExpenseRow>(['expenses', id], cached)

  await enqueue({ table: 'expenses', kind: 'upsert', payload: row })
  confirmToast('Expense saved')
  return id
}

export type ExpensePatch = Partial<
  Pick<
    Expense,
    | 'category'
    | 'amount_cents'
    | 'spent_on'
    | 'vendor'
    | 'note'
    | 'payment_method'
    | 'job_id'
    | 'client_id'
    | 'payee_id'
  >
>

export async function updateExpense(id: string, patch: ExpensePatch): Promise<void> {
  queryClient.setQueryData<ExpenseRow[]>(['expenses'], (old) =>
    old?.map((row) => (row.id === id ? { ...row, ...patch } : row)),
  )
  queryClient.setQueryData<ExpenseRow>(['expenses', id], (old) =>
    old ? { ...old, ...patch } : old,
  )
  await enqueue({ table: 'expenses', kind: 'update', payload: { id, patch } })
  confirmToast('Expense updated')
}

export async function deleteExpense(id: string): Promise<void> {
  queryClient.setQueryData<ExpenseRow[]>(['expenses'], (old) =>
    old?.filter((row) => row.id !== id),
  )
  await enqueue({ table: 'expenses', kind: 'delete', payload: { id } })
  confirmToast('Expense deleted')
}

/** Current local-date month as YYYY-MM, for the month-to-date Spent total. */
export function currentMonth(): string {
  const d = parseLocalDate(localToday())
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
