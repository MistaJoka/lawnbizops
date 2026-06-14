import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryClient } from '@/lib/queryClient'
import { enqueue } from '@/lib/outbox'
import { logActivity } from '@/features/activities/hooks'
import type { Tables } from '@/lib/database.types'

export type Client = Tables<'clients'>

export type ClientStage = 'lead' | 'quoted' | 'active' | 'dormant'

export const CLIENT_STAGES: { value: ClientStage; label: string }[] = [
  { value: 'lead', label: 'Lead' },
  { value: 'quoted', label: 'Quoted' },
  { value: 'active', label: 'Active' },
  { value: 'dormant', label: 'Dormant' },
]

/** Stage to advance to from a given stage (last stage has no next). */
export function nextStage(stage: string): ClientStage | null {
  const order: ClientStage[] = ['lead', 'quoted', 'active', 'dormant']
  const i = order.indexOf(stage as ClientStage)
  if (i === -1 || i === order.length - 1) return null
  return order[i + 1]
}

function stageLabel(stage: string): string {
  return CLIENT_STAGES.find((s) => s.value === stage)?.label ?? stage
}

export interface ClientDraft {
  id: string
  name: string
  phone: string
  email: string
  notes: string
  stage?: ClientStage
  archived_at?: string | null
}

/** Shared so a route loader can warm the list on tab-intent (preload). */
export const clientsQueryOptions = {
  queryKey: ['clients'] as const,
  queryFn: async (): Promise<Client[]> => {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .is('archived_at', null)
      .order('name')
    if (error) throw error
    return data
  },
}

export function useClients() {
  return useQuery(clientsQueryOptions)
}

export function useClient(id: string) {
  return useQuery({
    queryKey: ['clients', id],
    queryFn: async (): Promise<Client> => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', id)
        .single()
      if (error) throw error
      return data
    },
  })
}

/** Cache-only placeholder until the server row syncs back. */
function asClient(draft: ClientDraft, existing?: Client): Client {
  const now = new Date().toISOString()
  return {
    id: draft.id,
    name: draft.name,
    phone: draft.phone,
    email: draft.email,
    notes: draft.notes,
    stage: draft.stage ?? existing?.stage ?? 'active',
    archived_at:
      draft.archived_at !== undefined
        ? draft.archived_at
        : (existing?.archived_at ?? null),
    created_at: existing?.created_at ?? now,
    updated_at: now,
    user_id: existing?.user_id ?? '',
    org_id: existing?.org_id ?? '',
  }
}

/** Optimistically update caches, then enqueue the upsert through the outbox. */
export async function saveClient(draft: ClientDraft): Promise<void> {
  const existing = queryClient.getQueryData<Client>(['clients', draft.id])
  const merged = asClient(draft, existing)

  queryClient.setQueryData<Client[]>(['clients'], (old = []) => {
    const rest = old.filter((c) => c.id !== merged.id)
    if (merged.archived_at) return rest
    return [...rest, merged].sort((a, b) => a.name.localeCompare(b.name))
  })
  queryClient.setQueryData<Client>(['clients', draft.id], merged)

  await enqueue({ table: 'clients', kind: 'upsert', payload: { ...draft } })
}

/**
 * Bulk import (CSV). Adds all rows to the list cache in one pass, then enqueues
 * each upsert through the outbox (idempotent client-generated ids). Returns the
 * number imported.
 */
export async function importClients(drafts: ClientDraft[]): Promise<number> {
  if (drafts.length === 0) return 0
  const merged = drafts.map((d) => asClient(d))
  queryClient.setQueryData<Client[]>(['clients'], (old = []) =>
    [...old, ...merged].sort((a, b) => a.name.localeCompare(b.name)),
  )
  for (const draft of drafts) {
    await enqueue({ table: 'clients', kind: 'upsert', payload: { ...draft } })
  }
  return drafts.length
}

/**
 * Move a client to a new pipeline stage: patch both caches, enqueue the
 * clients update, and log a stage_change activity for the timeline.
 */
export async function setClientStage(client: Client, stage: ClientStage): Promise<void> {
  if (client.stage === stage) return

  queryClient.setQueryData<Client[]>(['clients'], (old) =>
    old?.map((c) => (c.id === client.id ? { ...c, stage } : c)),
  )
  queryClient.setQueryData<Client>(['clients', client.id], (old) =>
    old ? { ...old, stage } : old,
  )

  await enqueue({
    table: 'clients',
    kind: 'update',
    payload: { id: client.id, patch: { stage } },
  })
  await logActivity({
    clientId: client.id,
    kind: 'stage_change',
    body: `Stage → ${stageLabel(stage)}`,
  })
}

export async function archiveClient(client: Client): Promise<void> {
  await saveClient({
    id: client.id,
    name: client.name,
    phone: client.phone,
    email: client.email,
    notes: client.notes,
    archived_at: new Date().toISOString(),
  })
}
