import { supabase } from '@/lib/supabase'
import { queryClient } from '@/lib/queryClient'
import type { ClientStage } from './hooks'

/**
 * Soft advance gate (G-0 / G-H3, pipeline-stage-spec): when a manual stage
 * advance would skip the stage's exit criteria — Quoted with no estimate,
 * Active with no scheduled work — return a warning for the caller to confirm
 * instead of silently allowing it. Never hard-blocks: a `null` result means
 * "no objection", and every unknown (offline, query failed, data never
 * loaded) also resolves to null rather than getting in the way.
 */
export interface StageAdvanceWarning {
  title: string
  body: string
}

/** Row counts where null means "couldn't check" — callers must treat as OK. */
async function countClientEstimates(clientId: string): Promise<number | null> {
  // Prefer the shared estimates list cache (also patched by optimistic
  // creates) so the gate sees work done seconds ago, even offline.
  const cached = queryClient.getQueryData<{ client_id: string }[]>(['estimates'])
  if (cached) return cached.filter((e) => e.client_id === clientId).length
  try {
    const { count, error } = await supabase
      .from('estimates')
      .select('id', { count: 'exact', head: true })
      .eq('client_id', clientId)
    if (error) return null
    return count
  } catch {
    return null
  }
}

/** Jobs + recurring schedules across the client's properties. */
async function countScheduledWork(clientId: string): Promise<number | null> {
  try {
    let propertyIds = queryClient
      .getQueryData<{ id: string }[]>(['properties', { clientId }])
      ?.map((p) => p.id)
    if (!propertyIds) {
      const { data, error } = await supabase
        .from('properties')
        .select('id')
        .eq('client_id', clientId)
      if (error) return null
      propertyIds = data.map((p) => p.id)
    }
    if (propertyIds.length === 0) return 0

    const [jobs, schedules] = await Promise.all([
      supabase
        .from('jobs')
        .select('id', { count: 'exact', head: true })
        .in('property_id', propertyIds)
        .neq('status', 'canceled'),
      supabase
        .from('recurring_schedules')
        .select('id', { count: 'exact', head: true })
        .in('property_id', propertyIds),
    ])
    if (jobs.error || schedules.error) return null
    return (jobs.count ?? 0) + (schedules.count ?? 0)
  } catch {
    return null
  }
}

export async function stageAdvanceWarning(
  clientId: string,
  target: ClientStage,
): Promise<StageAdvanceWarning | null> {
  if (target === 'quoted') {
    if ((await countClientEstimates(clientId)) === 0) {
      return {
        title: 'Move to Quoted with no estimate?',
        body: "This client has no estimate yet, so Quoted won't reflect reality. Quote them from the card first — or move anyway.",
      }
    }
  } else if (target === 'active') {
    if ((await countScheduledWork(clientId)) === 0) {
      return {
        title: 'Move to Active with no scheduled work?',
        body: "No jobs or recurring schedules exist for this client's properties, so Active won't reflect reality. Schedule work first — or move anyway.",
      }
    }
  }
  return null
}
