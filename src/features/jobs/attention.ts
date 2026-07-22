import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// =============================================================================
// "Needs attention" queries — the two silent-loss channels surfaced app-wide:
//   * unbilled work — jobs marked done that no invoice ever picked up
//   * missed jobs   — still `scheduled` after their day came and went
// The nightly automation_sweep (0039) mirrors both as Follow-up tasks so they
// resurface even when the app stays closed; these hooks power the in-app views.
// =============================================================================

export interface UnbilledJobRow {
  id: string
  title: string
  scheduled_date: string
  completed_at: string | null
  price_cents: number
  property: { client_id: string; client: { name: string } | null } | null
}

export interface UnbilledClientGroup {
  clientId: string
  clientName: string
  jobCount: number
  totalCents: number
}

/** Group unbilled done jobs per client, biggest total first. Jobs without a
 *  property/client link are skipped — there is no one to invoice. */
export function groupUnbilledByClient(jobs: UnbilledJobRow[]): UnbilledClientGroup[] {
  const byClient = new Map<string, UnbilledClientGroup>()
  for (const job of jobs) {
    if (!job.property) continue
    const key = job.property.client_id
    const group = byClient.get(key) ?? {
      clientId: key,
      clientName: job.property.client?.name ?? 'Client',
      jobCount: 0,
      totalCents: 0,
    }
    group.jobCount += 1
    group.totalCents += job.price_cents
    byClient.set(key, group)
  }
  return [...byClient.values()].sort((a, b) => b.totalCents - a.totalCents)
}

/** Every done-but-uninvoiced job with a price, across ALL clients. The
 *  per-client variant lives in invoices/hooks (`useUninvoicedDoneJobs`); this
 *  one feeds the global "Unbilled work" card on Money. $0 jobs are excluded —
 *  there is nothing to bill. */
export function useUnbilledDoneJobs() {
  return useQuery({
    queryKey: ['jobs', { unbilled: 'all' }],
    queryFn: async (): Promise<UnbilledJobRow[]> => {
      const { data, error } = await supabase
        .from('jobs')
        .select(
          'id, title, scheduled_date, completed_at, price_cents, property:properties!inner(client_id, client:clients!inner(name))',
        )
        .eq('status', 'done')
        .gt('price_cents', 0)
        .order('scheduled_date')
      if (error) throw error
      return data as unknown as UnbilledJobRow[]
    },
  })
}

export interface MissedJobRow {
  id: string
  title: string
  scheduled_date: string
  start_time: string
  price_cents: number
  property: {
    label: string
    client: { name: string } | null
  } | null
}

/** Jobs still `scheduled` after their day passed — nothing else in the app
 *  surfaces these, so they otherwise vanish from Today silently. */
export function useMissedJobs(today: string) {
  return useQuery({
    queryKey: ['jobs', { missed: today }],
    queryFn: async (): Promise<MissedJobRow[]> => {
      const { data, error } = await supabase
        .from('jobs')
        .select(
          'id, title, scheduled_date, start_time, price_cents, property:properties(label, client:clients(name))',
        )
        .eq('status', 'scheduled')
        .lt('scheduled_date', today)
        .order('scheduled_date', { ascending: false })
      if (error) throw error
      return data as unknown as MissedJobRow[]
    },
  })
}
