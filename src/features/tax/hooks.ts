import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryClient } from '@/lib/queryClient'
import { enqueue } from '@/lib/outbox'
import { confirmToast } from '@/lib/toast'
import type { Tables } from '@/lib/database.types'

export type MileageLog = Tables<'mileage_logs'>
export type Vendor1099 = Tables<'vendors_1099'>

export const BUSINESS_ENTITIES: { value: string; label: string }[] = [
  { value: 'sole_prop', label: 'Sole proprietor' },
  { value: 'llc', label: 'LLC' },
  { value: 's_corp', label: 'S corp' },
  { value: 'c_corp', label: 'C corp' },
  { value: 'partnership', label: 'Partnership' },
]

// ---------------------------------------------------------------------------
// Pure tax math (no current-year IRS figures hardcoded — rate/pct are inputs)
// ---------------------------------------------------------------------------

/** Mileage deduction in cents: miles × the user-confirmed rate (cents/mile). */
export function mileageDeductionCents(miles: number, rateCents: number): number {
  return Math.round(miles * rateCents)
}

/** Quarterly set-aside in cents: YTD net × the user's set-aside %, floored at 0. */
export function quarterlySetAsideCents(ytdNetCents: number, pct: number): number {
  return Math.max(0, Math.round((ytdNetCents * pct) / 100))
}

// ---------------------------------------------------------------------------
// Mileage logs
// ---------------------------------------------------------------------------

export const mileageLogsQueryOptions = {
  queryKey: ['mileage_logs'] as const,
  queryFn: async (): Promise<MileageLog[]> => {
    const { data, error } = await supabase
      .from('mileage_logs')
      .select('*')
      .order('drove_on', { ascending: false })
    if (error) throw error
    return data
  },
}

export function useMileageLogs() {
  return useQuery(mileageLogsQueryOptions)
}

export interface CreateMileageInput {
  droveOn: string
  miles: number
  purpose: string
  jobId: string | null
  clientId: string | null
}

export async function createMileageLog(input: CreateMileageInput): Promise<string> {
  const id = crypto.randomUUID()
  const now = new Date().toISOString()
  const row = {
    id,
    drove_on: input.droveOn,
    miles: input.miles,
    purpose: input.purpose,
    job_id: input.jobId,
    client_id: input.clientId,
  }
  const cached: MileageLog = {
    ...row,
    created_at: now,
    updated_at: now,
    user_id: '',
    org_id: '',
  }
  queryClient.setQueryData<MileageLog[]>(['mileage_logs'], (old) =>
    old ? [cached, ...old] : [cached],
  )
  await enqueue({ table: 'mileage_logs', kind: 'upsert', payload: row })
  confirmToast('Trip logged')
  return id
}

export async function deleteMileageLog(id: string): Promise<void> {
  queryClient.setQueryData<MileageLog[]>(['mileage_logs'], (old) =>
    old?.filter((m) => m.id !== id),
  )
  await enqueue({ table: 'mileage_logs', kind: 'delete', payload: { id } })
  confirmToast('Trip removed')
}

// ---------------------------------------------------------------------------
// 1099 payees
// ---------------------------------------------------------------------------

export const vendors1099QueryOptions = {
  queryKey: ['vendors_1099'] as const,
  queryFn: async (): Promise<Vendor1099[]> => {
    const { data, error } = await supabase.from('vendors_1099').select('*').order('name')
    if (error) throw error
    return data
  },
}

export function useVendors1099() {
  return useQuery(vendors1099QueryOptions)
}

export interface CreateVendorInput {
  name: string
  taxId: string
  address: string
  email: string
  track1099: boolean
}

export async function createVendor1099(input: CreateVendorInput): Promise<string> {
  const id = crypto.randomUUID()
  const now = new Date().toISOString()
  const row = {
    id,
    name: input.name,
    tax_id: input.taxId,
    address: input.address,
    email: input.email,
    track_1099: input.track1099,
  }
  const cached: Vendor1099 = {
    ...row,
    created_at: now,
    updated_at: now,
    user_id: '',
    org_id: '',
  }
  queryClient.setQueryData<Vendor1099[]>(['vendors_1099'], (old) =>
    old ? [...old, cached].sort((a, b) => a.name.localeCompare(b.name)) : [cached],
  )
  await enqueue({ table: 'vendors_1099', kind: 'upsert', payload: row })
  confirmToast('Payee saved')
  return id
}

export async function deleteVendor1099(id: string): Promise<void> {
  queryClient.setQueryData<Vendor1099[]>(['vendors_1099'], (old) =>
    old?.filter((v) => v.id !== id),
  )
  await enqueue({ table: 'vendors_1099', kind: 'delete', payload: { id } })
  confirmToast('Payee removed')
}
