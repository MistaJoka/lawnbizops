import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryClient } from '@/lib/queryClient'
import { enqueue } from '@/lib/outbox'
import { confirmToast } from '@/lib/toast'
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
// Statuses the kanban board (`['jobs','kanban']`) keeps — active work only.
// An invoiced job leaves the board (it's represented by its invoice in A/R),
// so 'invoiced' is deliberately absent; the filter drops it on that transition.
const KANBAN_STATUSES = ['scheduled', 'in_progress', 'done']

function patchJobCaches(job: Job, patch: Partial<Job>): void {
  const oldDate = job.scheduled_date
  const newDate = patch.scheduled_date ?? oldDate

  queryClient.setQueryData<JobWithContext>(['jobs', job.id], (old) =>
    old ? { ...old, ...patch } : old,
  )

  // Keep the board cache in step so tap-to-advance moves cards instantly:
  // patch the row, then drop it if the new status left the kanban set.
  queryClient.setQueryData<JobWithContext[]>(['jobs', 'kanban'], (old) =>
    old
      ?.map((j) => (j.id === job.id ? { ...j, ...patch } : j))
      .filter((j) => KANBAN_STATUSES.includes(j.status)),
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

/** Human-readable confirmation per status transition (silent for the rest). */
const JOB_STATUS_TOAST: Partial<Record<JobStatus, string>> = {
  in_progress: 'Job started',
  done: 'Job marked done',
  scheduled: 'Job reopened',
  canceled: 'Job canceled',
}

/** Set job status; 'done' stamps completed_at. */
export async function setJobStatus(job: Job, status: JobStatus): Promise<void> {
  const patch: Partial<Job> =
    status === 'done' ? { status, completed_at: new Date().toISOString() } : { status }
  patchJobCaches(job, patch)
  await enqueue({ table: 'jobs', kind: 'update', payload: { id: job.id, patch } })
  const message = JOB_STATUS_TOAST[status]
  if (message) confirmToast(message)
}

/**
 * Flip jobs to 'invoiced' across every cached view (board, day list, detail) —
 * the symmetric half of creating an invoice from them, so the board, Today list,
 * and job detail all agree the instant the invoice is made (no double-invoice
 * window). The invoice mutation owns the enqueue; this owns the caches.
 */
export function markJobsInvoicedInCaches(
  jobs: { id: string; scheduled_date: string }[],
): void {
  for (const job of jobs) patchJobCaches(job as Job, { status: 'invoiced' })
}

/**
 * Inverse of the above for one job: when an invoice is voided, its job returns
 * from 'invoiced' to 'done' (billable again). Guarded so it never resurrects a
 * job that's in some other state.
 */
export function restoreInvoicedJobInCaches(jobId: string): void {
  const current = queryClient.getQueryData<JobWithContext>(['jobs', jobId])
  if (!current || current.status !== 'invoiced') return
  const restored: JobWithContext = { ...current, status: 'done' }
  queryClient.setQueryData<JobWithContext>(['jobs', jobId], restored)
  // Invoiced jobs are off the board, so re-insert (not just map) as done.
  queryClient.setQueryData<JobWithContext[]>(['jobs', 'kanban'], (old) =>
    old ? [...old.filter((j) => j.id !== jobId), restored] : old,
  )
}

/** Move a job to a different date. */
export async function rescheduleJob(job: Job, scheduledDate: string): Promise<void> {
  const patch: Partial<Job> = { scheduled_date: scheduledDate }
  patchJobCaches(job, patch)
  await enqueue({ table: 'jobs', kind: 'update', payload: { id: job.id, patch } })
  confirmToast('Job rescheduled')
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
  // Surface the new job on the board immediately (it's a scheduled card).
  queryClient.setQueryData<JobWithContext[]>(['jobs', 'kanban'], (old) =>
    old ? [...old.filter((j) => j.id !== draft.id), cached] : old,
  )
  await enqueue({ table: 'jobs', kind: 'upsert', payload: { ...row } })
  confirmToast('Job added')
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
        .in('status', ['scheduled', 'in_progress', 'done'])
        .order('scheduled_date', { ascending: true })
      if (error) throw error
      return data as unknown as JobWithContext[]
    },
  })
}
