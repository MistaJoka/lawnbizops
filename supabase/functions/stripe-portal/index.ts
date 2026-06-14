// Opens the Stripe customer portal (manage/cancel) for the caller's org.
// Dormant until keys are set (see ../_shared/stripe.ts).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2?target=deno'
import { APP_URL, corsHeaders, stripeClient } from '../_shared/stripe.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    const supa = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )
    const { data: sub } = await supa.from('subscriptions').select('stripe_customer_id').maybeSingle()
    const customer = sub?.stripe_customer_id
    if (!customer) throw new Error('no-customer')

    const stripe = stripeClient()
    const portal = await stripe.billingPortal.sessions.create({
      customer,
      return_url: `${APP_URL}/billing`,
    })
    return new Response(JSON.stringify({ url: portal.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'error'
    return new Response(JSON.stringify({ error: msg }), {
      status: msg === 'billing-not-configured' ? 503 : 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
