// Creates a Stripe Checkout session for the caller's org. Dormant until keys
// are set (see ../_shared/stripe.ts). Returns { url } for the client to redirect.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2?target=deno'
import { APP_URL, PRICE_BY_PLAN, corsHeaders, stripeClient } from '../_shared/stripe.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const { plan_id } = await req.json()
    const price = PRICE_BY_PLAN[plan_id]
    if (!price) throw new Error('billing-not-configured')

    // Identify the caller + their org under their own RLS context.
    const authHeader = req.headers.get('Authorization') ?? ''
    const supa = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )
    const { data: userRes } = await supa.auth.getUser()
    const email = userRes.user?.email ?? undefined
    const { data: orgId } = await supa.rpc('current_org')
    if (!orgId) throw new Error('no-org')

    const stripe = stripeClient()
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price, quantity: 1 }],
      customer_email: email,
      // org_id flows back to us on the webhook to update the right subscription.
      subscription_data: { metadata: { org_id: orgId } },
      metadata: { org_id: orgId },
      success_url: `${APP_URL}/billing?checkout=success`,
      cancel_url: `${APP_URL}/billing?checkout=cancel`,
    })

    return new Response(JSON.stringify({ url: session.url }), {
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
