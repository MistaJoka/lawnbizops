import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryClient } from '@/lib/queryClient'
import { enqueue } from '@/lib/outbox'
import type { Tables } from '@/lib/database.types'

export type Client = Tables<'clients'>

export interface ClientDraft {
  id: string
  name: string
  phone: string
  email: string
  notes: string
  archived_at?: string | null
}

export function useClients() {
  return useQuery({
    queryKey: ['clients'],
    queryFn: async (): Promise<Client[]> => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .is('archived_at', null)
        .order('name')
      if (error) throw error
      return data
    },
  })
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
