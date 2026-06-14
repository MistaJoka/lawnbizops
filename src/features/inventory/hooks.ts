import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryClient } from '@/lib/queryClient'
import { enqueue } from '@/lib/outbox'
import type { Tables } from '@/lib/database.types'

export type InventoryItem = Tables<'inventory_items'>

export type StockLevel = 'critical' | 'low' | 'in_stock'

export function stockLevel(item: InventoryItem): StockLevel {
  if (item.quantity <= item.reorder_level / 2) return 'critical'
  if (item.quantity <= item.reorder_level) return 'low'
  return 'in_stock'
}

const STOCK_LABEL: Record<StockLevel, string> = {
  critical: 'Critical',
  low: 'Low',
  in_stock: 'In stock',
}

export function stockLabel(level: StockLevel): string {
  return STOCK_LABEL[level]
}

export function useInventory(enabled = true) {
  return useQuery({
    queryKey: ['inventory_items'],
    enabled,
    queryFn: async (): Promise<InventoryItem[]> => {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .is('archived_at', null)
        .order('name')
      if (error) throw error
      return data
    },
  })
}

export interface InventoryDraft {
  id: string
  name: string
  category: string
  unit: string
  quantity: number
  reorder_level: number
  location: string
  notes: string
}

function asItem(draft: InventoryDraft, existing?: InventoryItem): InventoryItem {
  const now = new Date().toISOString()
  return {
    id: draft.id,
    name: draft.name,
    category: draft.category,
    unit: draft.unit,
    quantity: draft.quantity,
    reorder_level: draft.reorder_level,
    location: draft.location,
    notes: draft.notes,
    archived_at: null,
    created_at: existing?.created_at ?? now,
    updated_at: now,
    user_id: existing?.user_id ?? '',
    org_id: existing?.org_id ?? '',
  }
}

export async function saveInventoryItem(draft: InventoryDraft): Promise<void> {
  const existing = queryClient
    .getQueryData<InventoryItem[]>(['inventory_items'])
    ?.find((i) => i.id === draft.id)
  const merged = asItem(draft, existing)

  queryClient.setQueryData<InventoryItem[]>(['inventory_items'], (old = []) => {
    const rest = old.filter((i) => i.id !== merged.id)
    return [...rest, merged].sort((a, b) => a.name.localeCompare(b.name))
  })

  await enqueue({ table: 'inventory_items', kind: 'upsert', payload: { ...draft } })
}

export async function adjustInventoryQuantity(
  item: InventoryItem,
  delta: number,
): Promise<void> {
  const quantity = Math.max(0, Number(item.quantity) + delta)
  const draft: InventoryDraft = {
    id: item.id,
    name: item.name,
    category: item.category,
    unit: item.unit,
    quantity,
    reorder_level: item.reorder_level,
    location: item.location,
    notes: item.notes,
  }
  await saveInventoryItem(draft)
}

/** Landscaping starter SKUs from the stitch inventory mock. */
export async function loadStarterInventory(): Promise<void> {
  const existing = queryClient.getQueryData<InventoryItem[]>(['inventory_items']) ?? []
  if (existing.length > 0) return

  const starters: InventoryDraft[] = [
    {
      id: crypto.randomUUID(),
      name: 'Premium Hardwood Mulch',
      category: 'mulch',
      unit: 'bags',
      quantity: 5,
      reorder_level: 10,
      location: 'Truck A-12',
      notes: '',
    },
    {
      id: crypto.randomUUID(),
      name: 'Bermuda Grass Seed',
      category: 'seed',
      unit: 'lbs',
      quantity: 12,
      reorder_level: 5,
      location: 'Main WH',
      notes: '',
    },
    {
      id: crypto.randomUUID(),
      name: '2-Cycle Engine Oil',
      category: 'fluids',
      unit: 'quarts',
      quantity: 8,
      reorder_level: 4,
      location: 'Truck A-12',
      notes: '',
    },
    {
      id: crypto.randomUUID(),
      name: 'Trimmer Line .095"',
      category: 'parts',
      unit: 'spools',
      quantity: 2,
      reorder_level: 4,
      location: 'Main WH',
      notes: '',
    },
  ]

  for (const draft of starters) {
    await saveInventoryItem(draft)
  }
}
