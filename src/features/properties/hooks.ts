import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryClient } from '@/lib/queryClient'
import { enqueue } from '@/lib/outbox'
import { geocodeAddress } from '@/lib/geocode'
import { toast } from '@/lib/toast'
import type { Tables } from '@/lib/database.types'

export type Property = Tables<'properties'>
export type PropertyService = Tables<'property_services'>

export type PropertyType = 'residential' | 'commercial'

export interface PropertyDraft {
  id: string
  client_id: string
  label: string
  property_type: PropertyType
  address_line1: string
  address_line2: string
  city: string
  state: string
  zip: string
  gate_code: string
  notes: string
  lat: number | null
  lng: number | null
  archived_at?: string | null
}

export function useProperties(clientId: string) {
  return useQuery({
    queryKey: ['properties', { clientId }],
    enabled: clientId !== '',
    queryFn: async (): Promise<Property[]> => {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('client_id', clientId)
        .is('archived_at', null)
        .order('label')
      if (error) throw error
      return data
    },
  })
}

export function useProperty(id: string) {
  return useQuery({
    queryKey: ['properties', id],
    enabled: id !== '',
    queryFn: async (): Promise<Property> => {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('id', id)
        .single()
      if (error) throw error
      return data
    },
  })
}

export function usePropertyServices(propertyId: string) {
  return useQuery({
    queryKey: ['property_services', { propertyId }],
    enabled: propertyId !== '',
    queryFn: async (): Promise<PropertyService[]> => {
      const { data, error } = await supabase
        .from('property_services')
        .select('*')
        .eq('property_id', propertyId)
      if (error) throw error
      return data
    },
  })
}

/** Cache-only placeholder until the server row syncs back. */
function asProperty(draft: PropertyDraft, existing?: Property): Property {
  const now = new Date().toISOString()
  return {
    id: draft.id,
    client_id: draft.client_id,
    label: draft.label,
    property_type: draft.property_type,
    address_line1: draft.address_line1,
    address_line2: draft.address_line2,
    city: draft.city,
    state: draft.state,
    zip: draft.zip,
    gate_code: draft.gate_code,
    notes: draft.notes,
    lat: draft.lat,
    lng: draft.lng,
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
export async function saveProperty(draft: PropertyDraft): Promise<void> {
  const existing = queryClient.getQueryData<Property>(['properties', draft.id])
  const merged = asProperty(draft, existing)

  queryClient.setQueryData<Property[]>(
    ['properties', { clientId: draft.client_id }],
    (old = []) => {
      const rest = old.filter((p) => p.id !== merged.id)
      if (merged.archived_at) return rest
      return [...rest, merged].sort((a, b) => a.label.localeCompare(b.label))
    },
  )
  queryClient.setQueryData<Property>(['properties', draft.id], merged)

  await enqueue({ table: 'properties', kind: 'upsert', payload: { ...draft } })
}

/**
 * Geocode the address (best effort — never throws, never blocks save) and
 * save the property with whatever coordinates we found. Drafts that already
 * carry coordinates (address-autofill pick, or an unchanged address on edit)
 * skip the network round-trip entirely.
 */
export async function savePropertyWithGeocode(
  draft: Omit<PropertyDraft, 'lat' | 'lng'> & {
    lat?: number | null
    lng?: number | null
  },
): Promise<void> {
  const known =
    typeof draft.lat === 'number' && typeof draft.lng === 'number'
      ? { lat: draft.lat, lng: draft.lng }
      : null
  const coords =
    known ??
    (draft.address_line1
      ? await geocodeAddress({
          address_line1: draft.address_line1,
          city: draft.city,
          state: draft.state,
          zip: draft.zip,
        })
      : null)
  if (!coords && draft.address_line1) {
    // G-D1b: a silent Nominatim miss leaves a pin-less property that quietly
    // drops out of dispatch routing — say so, but never block the save.
    toast.info(
      "Couldn't pin this address — saved without a map location. Check the address on the property screen.",
    )
  }
  await saveProperty({ ...draft, lat: coords?.lat ?? null, lng: coords?.lng ?? null })
}

/** Set a per-property price override for a service. */
export async function savePropertyServicePrice(input: {
  property_id: string
  service_id: string
  price_cents: number
}): Promise<void> {
  const now = new Date().toISOString()
  queryClient.setQueryData<PropertyService[]>(
    ['property_services', { propertyId: input.property_id }],
    (old = []) => {
      const rest = old.filter((ps) => ps.service_id !== input.service_id)
      const existing = old.find((ps) => ps.service_id === input.service_id)
      return [
        ...rest,
        {
          ...input,
          created_at: existing?.created_at ?? now,
          updated_at: now,
          user_id: existing?.user_id ?? '',
          org_id: existing?.org_id ?? '',
        },
      ]
    },
  )
  await enqueue({ table: 'property_services', kind: 'upsert', payload: { ...input } })
}

/** One-line display address. */
export function formatAddress(p: Property): string {
  const street = [p.address_line1, p.address_line2].filter(Boolean).join(', ')
  const cityState = [p.city, [p.state, p.zip].filter(Boolean).join(' ')]
    .filter(Boolean)
    .join(', ')
  return [street, cityState].filter(Boolean).join(', ')
}
