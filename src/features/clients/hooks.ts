import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryClient } from '@/lib/queryClient'
import { enqueue } from '@/lib/outbox'
import { confirmToast } from '@/lib/toast'
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
  confirmToast(draft.archived_at ? 'Client archived' : 'Client saved')
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
  confirmToast(`Moved to ${stageLabel(stage)}`)
}

/**
 * Advance a client FORWARD to `target` as a side effect of doing the work —
 * estimate sent → quoted, payment received → active — so `clients.stage`
 * reflects reality instead of being a manual label (pipeline-stage-spec §0).
 * Reads the client from cache and no-ops unless the move is strictly forward
 * within lead→quoted→active. Never auto-sets dormant, never pulls a dormant
 * (or archived) client back into the funnel.
 */
export async function maybeAdvanceStage(
  clientId: string,
  target: ClientStage,
): Promise<void> {
  const order: ClientStage[] = ['lead', 'quoted', 'active', 'dormant']
  if (target === 'dormant') return
  const client =
    queryClient.getQueryData<Client>(['clients', clientId]) ??
    queryClient.getQueryData<Client[]>(['clients'])?.find((c) => c.id === clientId)
  if (!client || client.archived_at || client.stage === 'dormant') return
  const from = order.indexOf(client.stage as ClientStage)
  const to = order.indexOf(target)
  if (from === -1 || to <= from) return
  await setClientStage(client, target)
}

/**
 * Fold a duplicate client into another via the atomic merge RPC (0046):
 * properties, quotes, invoices, activity, tasks, and expenses move to the
 * kept client; the duplicate is archived. Offline-safe — the RPC rides the
 * outbox like any other write.
 */
export async function mergeClients(keep: Client, duplicate: Client): Promise<void> {
  // Optimistic: the duplicate leaves the list immediately.
  queryClient.setQueryData<Client[]>(['clients'], (old) =>
    old?.filter((c) => c.id !== duplicate.id),
  )
  await enqueue({
    table: 'clients',
    kind: 'rpc',
    payload: {
      fn: 'merge_clients',
      args: { p_keep: keep.id, p_merge: duplicate.id },
    },
  })
  // Everything client-scoped may have moved — refetch on next read.
  for (const key of [
    ['clients'],
    ['properties'],
    ['estimates'],
    ['invoices'],
    ['activities'],
    ['tasks'],
    ['expenses'],
  ]) {
    void queryClient.invalidateQueries({ queryKey: key })
  }
  confirmToast(`Merged into ${keep.name}`)
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
