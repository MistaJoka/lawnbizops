import { supabase } from '@/lib/supabase'

/**
 * Public, token-keyed estimate approval — the customer-facing half of the quote
 * flow. These call two SECURITY DEFINER RPCs (migration 0033) that are scoped to
 * the single row matching an unguessable token, so they run for anon users on
 * the public /e/<token> page without exposing the estimates table.
 *
 * These intentionally bypass the outbox: the customer is not an app user, there
 * is no offline queue for them, and the write is a server-validated RPC, not a
 * row upsert. (Same spirit as the sanctioned business_settings exception.)
 */

export interface ApprovalItem {
  description: string
  quantity: number
  unit_price_cents: number
}

export interface ApprovalBundle {
  id: string
  number: string | null
  status: string
  issued_at: string
  valid_until: string | null
  notes: string
  business_name: string
  client_name: string
  property_label: string
  items: ApprovalItem[]
}

/** Read the estimate behind a token. Returns null when the token is unknown. */
export async function fetchEstimateByToken(
  token: string,
): Promise<ApprovalBundle | null> {
  const { data, error } = await supabase.rpc('estimate_by_token', { p_token: token })
  if (error) throw error
  return (data as ApprovalBundle | null) ?? null
}

/** Approve or decline. Returns the resulting status (no-op if already answered). */
export async function respondToEstimate(
  token: string,
  action: 'accept' | 'decline',
): Promise<string> {
  const { data, error } = await supabase.rpc('respond_to_estimate', {
    p_token: token,
    p_action: action,
  })
  if (error) throw error
  return data as string
}

/** Sum of line items, in cents. */
export function approvalTotalCents(items: ApprovalItem[]): number {
  // Round per line (fractional quantities like 1.5 hrs) so the total stays
  // integer cents and matches the app-side lineTotalCents math exactly.
  return items.reduce((sum, i) => sum + Math.round(i.quantity * i.unit_price_cents), 0)
}
