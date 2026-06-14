import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryClient } from '@/lib/queryClient'
import { enqueue } from '@/lib/outbox'
import type { Json, Tables } from '@/lib/database.types'

export type Job = Tables<'jobs'>

export type JobStatus =
  | 'scheduled'
  | 'in_progress'
  | 'done'
  | 'skipped'
  | 'canceled'
  | 'invoiced'

/** Property + client context every job screen needs (nested select shape). */
export interface JobPropertyContext {
  id: string
  label: string
  address_line1: string
  city: string
  lat: number | null
  lng: number | null
  gate_code: string
  notes: string
  client: { id: string; name: string; phone: string } | null
}

export type JobWithContext = Job & { property: JobPropertyContext | null }

const JOB_SELECT =
  '*, property:properties(id, label, address_line1, city, lat, lng, gate_code, notes, client:clients(id, name, phone))'

/** Shared so a route loader can warm a day's jobs on tab-intent (preload). */
export function jobsForDateQueryOptions(date: string) {
  return {
    queryKey: ['jobs', { date }] as const,
    queryFn: async (): Promise<JobWithContext[]> => {
      const { data, error } = await supabase
        .from('jobs')
        .select(JOB_SELECT)
        .eq('scheduled_date', date)
        .neq('status', 'canceled')
      if (error) throw error
      return data as unknown as JobWithContext[]
    },
  }
}

export function useJobsForDate(date: string) {
  return useQuery(jobsForDateQueryOptions(date))
}

/** All non-canceled jobs in [from, to] — week strip counts + best-day helper. */
export function jobsForRangeQueryOptions(from: string, to: string) {
  return {
    queryKey: ['jobs', { from, to }] as const,
    queryFn: async (): Promise<JobWithContext[]> => {
      const { data, error } = await supabase
        .from('jobs')
        .select(JOB_SELECT)
        .gte('scheduled_date', from)
        .lte('scheduled_date', to)
        .neq('status', 'canceled')
      if (error) throw error
      return data as unknown as JobWithContext[]
    },
  }
}

export function useJobsForRange(from: string, to: string) {
  return useQuery(jobsForRangeQueryOptions(from, to))
}

export function useJob(id: string) {
  return useQuery({
    queryKey: ['jobs', id],
    queryFn: async (): Promise<JobWithContext> => {
      const { data, error } = await supabase
        .from('jobs')
        .select(JOB_SELECT)
        .eq('id', id)
        .single()
      if (error) throw error
      return data as unknown as JobWithContext
    },
  })
}

/**
 * Optimistically apply a patch to every cached view of a job. Handles the
 * date-list move when the patch reschedules the job.
 */
function patchJobCaches(job: Job, patch: Partial<Job>): void {
  const oldDate = job.scheduled_date
  const newDate = patch.scheduled_date ?? oldDate

  queryClient.setQueryData<JobWithContext>(['jobs', job.id], (old) =>
    old ? { ...old, ...patch } : old,
  )

  if (newDate === oldDate) {
    queryClient.setQueryData<JobWithContext[]>(['jobs', { date: oldDate }], (old) =>
      old?.map((j) => (j.id === job.id ? { ...j, ...patch } : j)),
    )
    return
  }

  let moved: JobWithContext | undefined
  queryClient.setQueryData<JobWithContext[]>(['jobs', { date: oldDate }], (old) => {
    moved = old?.find((j) => j.id === job.id)
    return old?.filter((j) => j.id !== job.id)
  })
  if (moved) {
    const movedJob = { ...moved, ...patch }
    queryClient.setQueryData<JobWithContext[]>(['jobs', { date: newDate }], (old) =>
      old ? [...old.filter((j) => j.id !== job.id), movedJob] : old,
    )
  }
}

/** Set job status; 'done' stamps completed_at. */
export async function setJobStatus(job: Job, status: JobStatus): Promise<void> {
  const patch: Partial<Job> =
    status === 'done' ? { status, completed_at: new Date().toISOString() } : { status }
  patchJobCaches(job, patch)
  await enqueue({ table: 'jobs', kind: 'update', payload: { id: job.id, patch } })
}

/** Move a job to a different date. */
export async function rescheduleJob(job: Job, scheduledDate: string): Promise<void> {
  const patch: Partial<Job> = { scheduled_date: scheduledDate }
  patchJobCaches(job, patch)
  await enqueue({ table: 'jobs', kind: 'update', payload: { id: job.id, patch } })
}

export interface ChecklistItem {
  id: string
  text: string
  done: boolean
}

export interface OneOffJobDraft {
  id: string
  property_id: string
  service_id: string | null
  scheduled_date: string
  start_time?: string
  price_cents: number
  title: string
  notes: string
  checklist?: ChecklistItem[]
}

/**
 * Create a one-off job (no schedule, no occurrence date). `property` is the
 * already-loaded context so the optimistic row renders fully offline.
 */
export async function createOneOffJob(
  draft: OneOffJobDraft,
  property: JobPropertyContext | null,
): Promise<void> {
  const now = new Date().toISOString()
  const row = {
    ...draft,
    start_time: draft.start_time ?? '',
    checklist: (draft.checklist ?? []) as unknown as Json,
    schedule_id: null,
    occurrence_date: null,
    status: 'scheduled' as const,
    completed_at: null,
  }
  const cached: JobWithContext = {
    ...row,
    property,
    created_at: now,
    updated_at: now,
    user_id: '',
    org_id: '',
  }
  queryClient.setQueryData<JobWithContext>(['jobs', draft.id], cached)
  queryClient.setQueryData<JobWithContext[]>(
    ['jobs', { date: draft.scheduled_date }],
    (old) => (old ? [...old.filter((j) => j.id !== draft.id), cached] : old),
  )
  await enqueue({ table: 'jobs', kind: 'upsert', payload: { ...row } })
}

/** Toggle or replace the on-site task checklist. */
export async function updateJobChecklist(
  job: Job,
  checklist: ChecklistItem[],
): Promise<void> {
  const patch = { checklist: checklist as unknown as Json }
  patchJobCaches(job, patch)
  await enqueue({ table: 'jobs', kind: 'update', payload: { id: job.id, patch } })
}

/** Active pipeline jobs for the kanban board. */
export function useKanbanJobs() {
  return useQuery({
    queryKey: ['jobs', 'kanban'],
    queryFn: async (): Promise<JobWithContext[]> => {
      const { data, error } = await supabase
        .from('jobs')
        .select(JOB_SELECT)
        .in('status', ['scheduled', 'in_progress', 'done', 'invoiced'])
        .order('scheduled_date', { ascending: true })
      if (error) throw error
      return data as unknown as JobWithContext[]
    },
  })
}
