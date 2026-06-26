import { supabase } from '@/lib/supabase'

/**
 * Public "Request a Quote" intake — the top-of-funnel half of the pipeline.
 * Keyed by a per-business intake token (migration 0034) via two anon-callable
 * SECURITY DEFINER RPCs, so the form runs for anonymous prospects without
 * exposing any table. submit_lead creates a client (stage='lead') + property.
 *
 * Bypasses the outbox by design: the prospect is not an app user.
 */

export interface LeadInput {
  name: string
  phone: string
  email: string
  address: string
  notes: string
}

/** Business display name for the form header. Null when the token is unknown. */
export async function fetchIntakeBusinessName(token: string): Promise<string | null> {
  const { data, error } = await supabase.rpc('intake_business_name', { p_token: token })
  if (error) throw error
  return (data as string | null) ?? null
}

/** Submit a lead. Resolves on success; rejects with the server's validation error. */
export async function submitLead(token: string, input: LeadInput): Promise<void> {
  const { error } = await supabase.rpc('submit_lead', {
    p_token: token,
    p_name: input.name,
    p_phone: input.phone,
    p_email: input.email,
    p_address: input.address,
    p_notes: input.notes,
  })
  if (error) throw error
}
