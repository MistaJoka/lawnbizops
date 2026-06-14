import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryClient } from '@/lib/queryClient'
import { enqueue } from '@/lib/outbox'
import { localToday } from '@/lib/format'
import { materializeHorizon } from '@/lib/dates'
import type { Cadence } from '@/lib/recurrence'
import type { Tables } from '@/lib/database.types'

export type RecurringSchedule = Tables<'recurring_schedules'>

export const CADENCES: Cadence[] = ['weekly', 'biweekly', 'every_4_weeks', 'monthly_day']

export function useSchedulesForProperty(propertyId: string) {
  return useQuery({
    queryKey: ['recurring_schedules', { propertyId }],
    queryFn: async (): Promise<RecurringSchedule[]> => {
      const { data, error } = await supabase
        .from('recurring_schedules')
        .select('*')
        .eq('property_id', propertyId)
        .order('created_at')
      if (error) throw error
      return data
    },
  })
}

export function useSchedule(id: string) {
  return useQuery({
    queryKey: ['recurring_schedules', id],
    queryFn: async (): Promise<RecurringSchedule> => {
      const { data, error } = await supabase
        .from('recurring_schedules')
        .select('*')
        .eq('id', id)
        .single()
      if (error) throw error
      return data
    },
  })
}

export interface ScheduleDraft {
  id: string
  property_id: string
  service_id: string | null
  cadence: Cadence
  anchor_date: string
  day_of_month: number | null
  price_cents: number
  notes: string
  ends_on: string | null
  paused_at: string | null
}

/** Cache-only placeholder until the server row syncs back. */
function asSchedule(
  draft: ScheduleDraft,
  existing?: RecurringSchedule,
): RecurringSchedule {
  const now = new Date().toISOString()
  return {
    ...draft,
    last_materialized_through: existing?.last_materialized_through ?? null,
    created_at: existing?.created_at ?? now,
    updated_at: now,
    user_id: existing?.user_id ?? '',
    org_id: existing?.org_id ?? '',
  }
}

function setScheduleCaches(merged: RecurringSchedule): void {
  queryClient.setQueryData<RecurringSchedule>(['recurring_schedules', merged.id], merged)
  queryClient.setQueryData<RecurringSchedule[]>(
    ['recurring_schedules', { propertyId: merged.property_id }],
    (old = []) => [...old.filter((s) => s.id !== merged.id), merged],
  )
}

/**
 * Upsert the schedule, then materialize/resync its jobs out to the horizon.
 * FIFO outbox ordering guarantees the RPC sees the saved row.
 */
export async function saveSchedule(
  draft: ScheduleDraft,
  opts: { isNew: boolean },
): Promise<void> {
  const existing = queryClient.getQueryData<RecurringSchedule>([
    'recurring_schedules',
    draft.id,
  ])
  setScheduleCaches(asSchedule(draft, existing))

  await enqueue({
    table: 'recurring_schedules',
    kind: 'upsert',
    payload: { ...draft },
  })
  if (opts.isNew) {
    await enqueue({
      table: 'jobs',
      kind: 'rpc',
      payload: { fn: 'materialize_jobs', args: { through_date: materializeHorizon() } },
    })
  } else {
    await enqueue({
      table: 'jobs',
      kind: 'rpc',
      payload: {
        fn: 'resync_schedule',
        args: { p_schedule_id: draft.id, through_date: materializeHorizon() },
      },
    })
  }
}

/** Pause or resume, then resync so future jobs match the new state. */
export async function setSchedulePaused(
  schedule: RecurringSchedule,
  paused: boolean,
): Promise<void> {
  const paused_at = paused ? new Date().toISOString() : null
  setScheduleCaches({ ...schedule, paused_at, updated_at: new Date().toISOString() })

  await enqueue({
    table: 'recurring_schedules',
    kind: 'update',
    payload: { id: schedule.id, patch: { paused_at } },
  })
  await enqueue({
    table: 'jobs',
    kind: 'rpc',
    payload: {
      fn: 'resync_schedule',
      args: { p_schedule_id: schedule.id, through_date: materializeHorizon() },
    },
  })
}

/**
 * Delete a schedule and its future untouched jobs. The FK sets jobs.schedule_id
 * null on delete, so we enqueue deletes for the future 'scheduled' jobs FIRST —
 * FIFO ordering means they're gone before the schedule row is.
 */
export async function deleteSchedule(schedule: RecurringSchedule): Promise<void> {
  const today = localToday()
  const { data: futureJobs, error } = await supabase
    .from('jobs')
    .select('id, scheduled_date')
    .eq('schedule_id', schedule.id)
    .eq('status', 'scheduled')
    .gte('scheduled_date', today)
  if (error) throw error

  for (const job of futureJobs) {
    queryClient.setQueryData<{ id: string }[]>(
      ['jobs', { date: job.scheduled_date }],
      (old) => old?.filter((j) => j.id !== job.id),
    )
    await enqueue({ table: 'jobs', kind: 'delete', payload: { id: job.id } })
  }

  queryClient.setQueryData<RecurringSchedule[]>(
    ['recurring_schedules', { propertyId: schedule.property_id }],
    (old) => old?.filter((s) => s.id !== schedule.id),
  )
  queryClient.removeQueries({ queryKey: ['recurring_schedules', schedule.id] })
  await enqueue({
    table: 'recurring_schedules',
    kind: 'delete',
    payload: { id: schedule.id },
  })
}

function ordinal(n: number): string {
  const rem10 = n % 10
  const rem100 = n % 100
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`
  if (rem10 === 1) return `${n}st`
  if (rem10 === 2) return `${n}nd`
  if (rem10 === 3) return `${n}rd`
  return `${n}th`
}

/** Plain-words cadence: "Every 2 weeks", "Monthly on the 15th". */
export function cadenceLabel(cadence: string, dayOfMonth?: number | null): string {
  switch (cadence) {
    case 'weekly':
      return 'Every week'
    case 'biweekly':
      return 'Every 2 weeks'
    case 'every_4_weeks':
      return 'Every 4 weeks'
    case 'monthly_day':
      return dayOfMonth ? `Monthly on the ${ordinal(dayOfMonth)}` : 'Monthly'
    default:
      return cadence
  }
}
