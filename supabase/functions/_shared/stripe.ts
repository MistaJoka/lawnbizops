// Shared config for the Stripe Edge Functions.
//
// ACTIVATION (one-time, when you're ready to charge for the SaaS):
//   1. Create a Stripe account + two recurring Prices (monthly, yearly).
//   2. Map plan_id → Stripe price id in PRICE_BY_PLAN below.
//   3. Set Supabase function secrets:
//        supabase secrets set STRIPE_SECRET_KEY=sk_live_... \
//                             STRIPE_WEBHOOK_SECRET=whsec_... \
//                             APP_URL=https://your-app-url
//   4. Deploy:  supabase functions deploy stripe-checkout stripe-portal stripe-webhook
//   5. Add the webhook endpoint (…/functions/v1/stripe-webhook) in Stripe,
//      subscribing to: checkout.session.completed,
//      customer.subscription.updated, customer.subscription.deleted.
//
// Until then the app's billing screen catches the "not configured" error and
// shows a friendly message — the seam is live, the charge path is dormant.

import Stripe from 'https://esm.sh/stripe@16?target=deno'

export const PRICE_BY_PLAN: Record<string, string | undefined> = {
  pro_monthly: Deno.env.get('STRIPE_PRICE_PRO_MONTHLY'),
  pro_yearly: Deno.env.get('STRIPE_PRICE_PRO_YEARLY'),
}

export function stripeClient(): Stripe {
  const key = Deno.env.get('STRIPE_SECRET_KEY')
  if (!key) throw new Error('billing-not-configured')
  return new Stripe(key, { apiVersion: '2024-06-20', httpClient: Stripe.createFetchHttpClient() })
}

export const APP_URL = Deno.env.get('APP_URL') ?? 'http://localhost:5173'

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
