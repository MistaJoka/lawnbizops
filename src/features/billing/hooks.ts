import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Tables } from '@/lib/database.types'

export type Subscription = Tables<'subscriptions'>
export type Plan = Tables<'plans'>

export function useSubscription() {
  return useQuery({
    queryKey: ['subscription'],
    queryFn: async (): Promise<Subscription | null> => {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .maybeSingle()
      if (error) throw error
      return data
    },
  })
}

export function usePlans() {
  return useQuery({
    queryKey: ['plans'],
    staleTime: 60 * 60 * 1000,
    queryFn: async (): Promise<Plan[]> => {
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .eq('active', true)
        .order('price_cents')
      if (error) throw error
      return data
    },
  })
}

/** Whole days left in the trial (0 if expired/none). */
export function trialDaysLeft(sub: Subscription | null | undefined): number {
  if (!sub?.trial_ends_at) return 0
  const ms = new Date(sub.trial_ends_at).getTime() - Date.now()
  return ms <= 0 ? 0 : Math.ceil(ms / 86_400_000)
}

/**
 * Start a Stripe Checkout session via the Edge Function. Returns the redirect
 * URL, or throws a friendly error when billing isn't configured yet (no Stripe
 * keys) — the seam is live, the integration lights up when keys are set.
 */
export async function startCheckout(planId: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke('stripe-checkout', {
    body: { plan_id: planId },
  })
  if (error) {
    throw new Error(
      'Online subscriptions aren’t enabled yet. Reach out and we’ll get you set up.',
    )
  }
  const url = (data as { url?: string } | null)?.url
  if (!url) throw new Error('Could not start checkout — please try again.')
  return url
}

/** Open the Stripe customer portal (manage/cancel) for an active subscription. */
export async function openBillingPortal(): Promise<string> {
  const { data, error } = await supabase.functions.invoke('stripe-portal', {})
  if (error) throw new Error('Billing portal isn’t available right now.')
  const url = (data as { url?: string } | null)?.url
  if (!url) throw new Error('Could not open the billing portal.')
  return url
}
