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
