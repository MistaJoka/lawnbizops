import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import {
  useKanbanJobs,
  type JobPropertyContext,
  type JobWithContext,
} from '@/features/jobs/hooks'
import { useEstimates, type EstimateListRow } from '@/features/estimates/hooks'
import {
  isOpen,
  useInvoiceBalances,
  type InvoiceBalance,
} from '@/features/invoices/hooks'
import { localToday } from '@/lib/format'
import { addDaysISO } from '@/lib/dates'

// ---------------------------------------------------------------------------
// Lanes — the work/money pipeline, quote → cash
// ---------------------------------------------------------------------------

export type LaneId = 'quote' | 'scheduled' | 'in_progress' | 'done' | 'ar' | 'paid'

export interface LaneDef {
  id: LaneId
  title: string
  tint: string
}

export const LANES: LaneDef[] = [
  { id: 'quote', title: 'Quote', tint: 'border-outline' },
  { id: 'scheduled', title: 'Scheduled', tint: 'border-edge' },
  { id: 'in_progress', title: 'In progress', tint: 'border-khaki' },
  { id: 'done', title: 'Done', tint: 'border-go' },
  { id: 'ar', title: 'Invoiced · A/R', tint: 'border-blaze' },
  { id: 'paid', title: 'Paid', tint: 'border-go' },
]

export interface BoardLanes {
  quote: EstimateListRow[]
  scheduled: JobWithContext[]
  in_progress: JobWithContext[]
  done: JobWithContext[]
  ar: InvoiceBalance[]
  paid: InvoiceBalance[]
}

/** How far ahead the Scheduled lane looks (further-out work lives in Schedule). */
export const SCHEDULED_HORIZON_DAYS = 21

/**
 * Pure bucketing: fan the three entity lists into lanes. Quote = open estimates,
 * the three middle lanes = job status, A/R = open invoices, Paid = settled ones.
 * `scheduledThrough` (a date string) windows the Scheduled backlog so the board
 * doesn't drown in weeks of materialized recurring jobs; omit it to show all.
 * Kept side-effect-free so it's unit-tested without React.
 */
export function bucketBoard(input: {
  jobs: JobWithContext[]
  estimates: EstimateListRow[]
  invoices: InvoiceBalance[]
  scheduledThrough?: string
}): BoardLanes {
  const { jobs, estimates, invoices, scheduledThrough } = input
  return {
    quote: estimates.filter((e) => e.status === 'draft' || e.status === 'sent'),
    scheduled: jobs.filter(
      (j) =>
        j.status === 'scheduled' &&
        (!scheduledThrough || j.scheduled_date <= scheduledThrough),
    ),
    in_progress: jobs.filter((j) => j.status === 'in_progress'),
    done: jobs.filter((j) => j.status === 'done'),
    ar: invoices.filter(isOpen),
    paid: invoices.filter((inv) => inv.status === 'paid'),
  }
}

// ---------------------------------------------------------------------------
// WIP signals — advisory only (tint a lane's count badge), never a hard block.
// Caps encode lean flow: cap quote follow-up debt, hold WIP low (Little's Law),
// and clear unbilled "done" work fast (unconverted revenue).
// ---------------------------------------------------------------------------

export const WIP_CAPS: Partial<Record<LaneId, number>> = {
  quote: 10,
  in_progress: 2,
  done: 5,
}

export function wipLevel(lane: LaneId, count: number): 'ok' | 'over' {
  const cap = WIP_CAPS[lane]
  return cap !== undefined && count > cap ? 'over' : 'ok'
}

// ---------------------------------------------------------------------------
// Board data
// ---------------------------------------------------------------------------

export interface PipelineBoard {
  lanes: BoardLanes
  isLoading: boolean
}

export function usePipelineBoard(): PipelineBoard {
  const jobs = useKanbanJobs()
  const estimates = useEstimates()
  const invoices = useInvoiceBalances()

  const lanes = bucketBoard({
    jobs: jobs.data ?? [],
    estimates: estimates.data ?? [],
    invoices: invoices.data ?? [],
    scheduledThrough: addDaysISO(localToday(), SCHEDULED_HORIZON_DAYS),
  })

  return {
    lanes,
    isLoading: jobs.isLoading || estimates.isLoading || invoices.isLoading,
  }
}

// ---------------------------------------------------------------------------
// Quick-add targets — pick a property, repeat its last job (same-as-last-time).
// Most recently serviced properties bubble up, giving "recents first" for free.
// ---------------------------------------------------------------------------

export interface QuickAddDefaults {
  service_id: string | null
  price_cents: number
  title: string
}

/** Default a new job from the property's most recent job, else a blank job. */
export function resolveQuickAddDefaults(latestJob?: {
  service_id: string | null
  price_cents: number
  title: string
}): QuickAddDefaults {
  if (!latestJob) return { service_id: null, price_cents: 0, title: '' }
  return {
    service_id: latestJob.service_id,
    price_cents: latestJob.price_cents,
    title: latestJob.title,
  }
}

export interface QuickAddTarget {
  property: JobPropertyContext
  client_name: string
  defaults: QuickAddDefaults
  last_date: string | null
}

interface PropertyRow {
  id: string
  label: string
  address_line1: string
  city: string
  lat: number | null
  lng: number | null
  gate_code: string
  notes: string
  client_id: string
  client: { id: string; name: string; phone: string } | null
}

interface RecentJobRow {
  property_id: string
  price_cents: number
  service_id: string | null
  title: string
  scheduled_date: string
}

/**
 * Build the quick-add property list with each property's last-job defaults,
 * ordered most-recently-serviced first (then alphabetical for never-serviced).
 */
export function useQuickAddTargets() {
  return useQuery({
    queryKey: ['quick_add_targets'],
    queryFn: async (): Promise<QuickAddTarget[]> => {
      const [{ data: props, error: pErr }, { data: jobs, error: jErr }] =
        await Promise.all([
          supabase
            .from('properties')
            .select(
              'id, label, address_line1, city, lat, lng, gate_code, notes, client_id, client:clients(id, name, phone)',
            )
            .is('archived_at', null)
            .order('label'),
          supabase
            .from('jobs')
            .select('property_id, price_cents, service_id, title, scheduled_date')
            .neq('status', 'canceled')
            .order('scheduled_date', { ascending: false }),
        ])
      if (pErr) throw pErr
      if (jErr) throw jErr

      // First job per property = most recent (list is date-desc).
      const latest = new Map<string, RecentJobRow>()
      for (const job of (jobs ?? []) as RecentJobRow[]) {
        if (!latest.has(job.property_id)) latest.set(job.property_id, job)
      }

      const targets: QuickAddTarget[] = ((props ?? []) as unknown as PropertyRow[]).map(
        (p) => {
          const last = latest.get(p.id)
          return {
            property: {
              id: p.id,
              label: p.label,
              address_line1: p.address_line1,
              city: p.city,
              lat: p.lat,
              lng: p.lng,
              gate_code: p.gate_code,
              notes: p.notes,
              client: p.client,
            },
            client_name: p.client?.name ?? 'Client',
            defaults: resolveQuickAddDefaults(last),
            last_date: last?.scheduled_date ?? null,
          }
        },
      )

      // Recently serviced first; never-serviced keep alphabetical (label order).
      return targets.sort((a, b) => {
        if (a.last_date && b.last_date) return a.last_date < b.last_date ? 1 : -1
        if (a.last_date) return -1
        if (b.last_date) return 1
        return 0
      })
    },
  })
}
