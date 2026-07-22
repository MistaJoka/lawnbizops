import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryClient } from '@/lib/queryClient'
import { enqueue } from '@/lib/outbox'
import type { Tables } from '@/lib/database.types'

export type Activity = Tables<'activities'>

export type ActivityKind = 'note' | 'call' | 'stage_change' | 'status_change' | 'doc_sent'

export interface LogActivityInput {
  clientId: string
  jobId?: string | null
  kind: ActivityKind
  body: string
}

export function useActivities(clientId: string) {
  return useQuery({
    queryKey: ['activities', clientId],
    enabled: clientId !== '',
    queryFn: async (): Promise<Activity[]> => {
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

export interface NotableActivity extends Omit<Activity, 'client_id'> {
  /** Never null here — the lead/approval RPCs always attach the client. */
  client_id: string
  client: { name: string } | null
}

/**
 * The events that happen WITHOUT the operator present — the ones a CRM must
 * surface or they rot: a new lead from the public quote form (0034) and a
 * customer approving/declining online (0033). Matched by the stable bodies
 * those RPCs write. Operator-keyed events (payments, notes) are excluded —
 * they're not news to the person who keyed them.
 */
export function isNotable(activity: Activity): boolean {
  return (
    activity.body.startsWith('New lead from') ||
    activity.body.startsWith('Repeat inquiry') ||
    activity.body.startsWith('Customer approved') ||
    activity.body.startsWith('Customer declined')
  )
}

/** Cross-client feed of notable events from the last 14 days, newest first. */
export function useNotableActivities() {
  return useQuery({
    queryKey: ['activities', 'notable'],
    queryFn: async (): Promise<NotableActivity[]> => {
      const since = new Date(Date.now() - 14 * 86_400_000).toISOString()
      const { data, error } = await supabase
        .from('activities')
        .select('*, client:clients(name)')
        .in('kind', ['note', 'status_change'])
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(30)
      if (error) throw error
      return (data as unknown as NotableActivity[]).filter(
        (a) => isNotable(a) && a.client_id !== null,
      )
    },
  })
}

/** Append a timeline entry: optimistic prepend, then enqueue the upsert. */
export async function logActivity(input: LogActivityInput): Promise<void> {
  const id = crypto.randomUUID()
  const row = {
    id,
    client_id: input.clientId,
    job_id: input.jobId ?? null,
    kind: input.kind,
    body: input.body,
  }

  const now = new Date().toISOString()
  const cached: Activity = {
    ...row,
    created_at: now,
    user_id: '',
    org_id: '',
  }
  queryClient.setQueryData<Activity[]>(['activities', input.clientId], (old) =>
    old ? [cached, ...old] : [cached],
  )

  await enqueue({ table: 'activities', kind: 'upsert', payload: row })
}
