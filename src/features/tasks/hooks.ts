import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryClient } from '@/lib/queryClient'
import { enqueue } from '@/lib/outbox'
import type { Tables } from '@/lib/database.types'

export type Task = Tables<'tasks'>

export interface TaskDraft {
  id?: string
  title: string
  due_date: string | null
  client_id?: string | null
}

/** Open follow-ups across all clients, nulls-last by due date. */
export function useOpenTasks() {
  return useQuery({
    queryKey: ['tasks', 'open'],
    queryFn: async (): Promise<Task[]> => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('done', false)
        .order('due_date', { ascending: true, nullsFirst: false })
      if (error) throw error
      return data
    },
  })
}

export function useTasksForClient(clientId: string) {
  return useQuery({
    queryKey: ['tasks', { clientId }],
    enabled: clientId !== '',
    queryFn: async (): Promise<Task[]> => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('client_id', clientId)
        .eq('done', false)
        .order('due_date', { ascending: true, nullsFirst: false })
      if (error) throw error
      return data
    },
  })
}

function nullsLast(a: Task, b: Task): number {
  if (a.due_date === b.due_date) return 0
  if (a.due_date === null) return 1
  if (b.due_date === null) return -1
  return a.due_date.localeCompare(b.due_date)
}

/** Upsert a follow-up, optimistically updating the open + per-client caches. */
export async function saveTask(draft: TaskDraft): Promise<void> {
  const id = draft.id ?? crypto.randomUUID()
  const clientId = draft.client_id ?? null
  const row = {
    id,
    title: draft.title,
    due_date: draft.due_date,
    client_id: clientId,
  }

  const now = new Date().toISOString()
  const existing = queryClient
    .getQueryData<Task[]>(['tasks', 'open'])
    ?.find((t) => t.id === id)
  const cached: Task = {
    id,
    title: draft.title,
    due_date: draft.due_date,
    client_id: clientId,
    done: existing?.done ?? false,
    created_at: existing?.created_at ?? now,
    updated_at: now,
    user_id: '',
    org_id: '',
  }

  const upsertInto = (old: Task[] | undefined): Task[] => {
    const rest = (old ?? []).filter((t) => t.id !== id)
    if (cached.done) return rest.sort(nullsLast)
    return [...rest, cached].sort(nullsLast)
  }

  queryClient.setQueryData<Task[]>(['tasks', 'open'], upsertInto)
  if (clientId) {
    queryClient.setQueryData<Task[]>(['tasks', { clientId }], upsertInto)
  }

  await enqueue({ table: 'tasks', kind: 'upsert', payload: row })
}

/** Flip done; a now-done task drops out of the open + per-client lists. */
export async function toggleTaskDone(task: Task): Promise<void> {
  const done = !task.done

  const apply = (old: Task[] | undefined): Task[] =>
    done
      ? (old ?? []).filter((t) => t.id !== task.id)
      : (old ?? []).map((t) => (t.id === task.id ? { ...t, done } : t))

  queryClient.setQueryData<Task[]>(['tasks', 'open'], apply)
  if (task.client_id) {
    queryClient.setQueryData<Task[]>(['tasks', { clientId: task.client_id }], apply)
  }

  await enqueue({
    table: 'tasks',
    kind: 'update',
    payload: { id: task.id, patch: { done } },
  })
}
