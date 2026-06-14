import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryClient } from '@/lib/queryClient'
import { enqueue } from '@/lib/outbox'
import type { Tables } from '@/lib/database.types'

export type Service = Tables<'services'>

export type ServiceUnit = 'flat' | 'hour' | 'sqft' | 'yard'
export const SERVICE_UNITS: ServiceUnit[] = ['flat', 'hour', 'sqft', 'yard']

/** Human captions for units — "per flat" reads awkward, "flat rate" doesn't. */
export const UNIT_LABELS: Record<ServiceUnit, string> = {
  flat: 'flat rate',
  hour: 'per hour',
  sqft: 'per sq ft',
  yard: 'per yard',
}

export function unitLabel(unit: string): string {
  return UNIT_LABELS[unit as ServiceUnit] ?? unit
}

export interface ServiceDraft {
  id: string
  name: string
  description: string
  default_price_cents: number
  unit: string
  archived_at?: string | null
}

export function useServices() {
  return useQuery({
    queryKey: ['services'],
    queryFn: async (): Promise<Service[]> => {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .is('archived_at', null)
        .order('name')
      if (error) throw error
      return data
    },
  })
}

/** Cache-only placeholder until the server row syncs back. */
function asService(draft: ServiceDraft, existing?: Service): Service {
  const now = new Date().toISOString()
  return {
    id: draft.id,
    name: draft.name,
    description: draft.description,
    default_price_cents: draft.default_price_cents,
    unit: draft.unit,
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

/** Optimistically update the cache, then enqueue the upsert through the outbox. */
export async function saveService(draft: ServiceDraft): Promise<void> {
  const existing = queryClient
    .getQueryData<Service[]>(['services'])
    ?.find((s) => s.id === draft.id)
  const merged = asService(draft, existing)

  queryClient.setQueryData<Service[]>(['services'], (old = []) => {
    const rest = old.filter((s) => s.id !== merged.id)
    if (merged.archived_at) return rest
    return [...rest, merged].sort((a, b) => a.name.localeCompare(b.name))
  })

  await enqueue({ table: 'services', kind: 'upsert', payload: { ...draft } })
}

export async function archiveService(service: Service): Promise<void> {
  await saveService({
    id: service.id,
    name: service.name,
    description: service.description,
    default_price_cents: service.default_price_cents,
    unit: service.unit,
    archived_at: new Date().toISOString(),
  })
}

const STARTER_CATALOG: Omit<ServiceDraft, 'id'>[] = [
  {
    name: 'Lawn Maintenance',
    description: 'mow, edge, blow',
    default_price_cents: 4500,
    unit: 'flat',
  },
  {
    name: 'Plant & Small Tree Installation',
    description: '',
    default_price_cents: 6500,
    unit: 'hour',
  },
  {
    name: 'Driveway Bricklaying',
    description: '',
    default_price_cents: 1200,
    unit: 'sqft',
  },
  {
    name: 'Mulch Installation',
    description: '',
    default_price_cents: 8500,
    unit: 'yard',
  },
  { name: 'Sod Installation', description: '', default_price_cents: 250, unit: 'sqft' },
  {
    name: 'Hedge & Palm Trimming',
    description: '',
    default_price_cents: 7500,
    unit: 'flat',
  },
  { name: 'Pressure Washing', description: '', default_price_cents: 15000, unit: 'flat' },
  { name: 'Storm Cleanup', description: '', default_price_cents: 8000, unit: 'hour' },
]

/** Seed the 8 starter services when the catalog is empty. */
export async function loadStarterCatalog(): Promise<void> {
  for (const item of STARTER_CATALOG) {
    await saveService({ ...item, id: crypto.randomUUID() })
  }
}
