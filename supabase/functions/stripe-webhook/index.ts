// Stripe webhook → keeps public.subscriptions in sync. Uses the service-role
// key (bypasses RLS) and verifies the Stripe signature. Dormant until secrets
// are set + the endpoint is registered in Stripe (see ../_shared/stripe.ts).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2?target=deno'
import { stripeClient } from '../_shared/stripe.ts'

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

Deno.serve(async (req) => {
  const sig = req.headers.get('stripe-signature')
  const secret = Deno.env.get('STRIPE_WEBHOOK_SECRET')
  if (!sig || !secret) return new Response('not configured', { status: 503 })

  let event
  try {
    const stripe = stripeClient()
    event = await stripe.webhooks.constructEventAsync(await req.text(), sig, secret)
  } catch (e) {
    return new Response(`bad signature: ${e instanceof Error ? e.message : e}`, {
      status: 400,
    })
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const s = event.data.object as Record<string, unknown>
      const orgId = (s.metadata as Record<string, string>)?.org_id
      if (orgId) {
        await admin
          .from('subscriptions')
          .update({
            status: 'active',
            stripe_customer_id: s.customer as string,
            stripe_subscription_id: s.subscription as string,
          })
          .eq('org_id', orgId)
      }
    } else if (
      event.type === 'customer.subscription.updated' ||
      event.type === 'customer.subscription.deleted'
    ) {
      const sub = event.data.object as Record<string, unknown>
      const orgId = (sub.metadata as Record<string, string>)?.org_id
      const status =
        event.type === 'customer.subscription.deleted'
          ? 'canceled'
          : sub.status === 'active' || sub.status === 'trialing'
            ? 'active'
            : sub.status === 'past_due'
              ? 'past_due'
              : 'canceled'
      const periodEnd = sub.current_period_end
        ? new Date((sub.current_period_end as number) * 1000).toISOString()
        : null
      const query = admin
        .from('subscriptions')
        .update({ status, current_period_end: periodEnd })
      if (orgId) await query.eq('org_id', orgId)
      else await query.eq('stripe_subscription_id', sub.id as string)
    }
    return new Response('ok', { status: 200 })
  } catch (e) {
    return new Response(`handler error: ${e instanceof Error ? e.message : e}`, {
      status: 500,
    })
  }
})
