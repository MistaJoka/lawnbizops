import { useState } from 'react'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { supabase } from '@/lib/supabase'
import {
  openBillingPortal,
  startCheckout,
  trialDaysLeft,
  usePlans,
  useSubscription,
} from '@/features/billing/hooks'
import { refreshAppState, signOut } from '@/features/auth/hooks'
import { formatCents } from '@/lib/format'

export const Route = createFileRoute('/billing')({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession()
    if (!data.session) throw redirect({ to: '/login' })
  },
  component: BillingScreen,
})

function BillingScreen() {
  const navigate = useNavigate()
  const { data: sub } = useSubscription()
  const { data: plans } = usePlans()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const status = sub?.status ?? 'trialing'
  const daysLeft = trialDaysLeft(sub)
  const hasAccess = status === 'active' || (status === 'trialing' && daysLeft > 0)

  async function subscribe(planId: string) {
    setBusy(true)
    setError(null)
    try {
      window.location.assign(await startCheckout(planId))
    } catch (e) {
      setBusy(false)
      setError(e instanceof Error ? e.message : 'Something went wrong.')
    }
  }

  async function manage() {
    setBusy(true)
    setError(null)
    try {
      window.location.assign(await openBillingPortal())
    } catch (e) {
      setBusy(false)
      setError(e instanceof Error ? e.message : 'Something went wrong.')
    }
  }

  return (
    <div className="mx-auto w-full max-w-md px-edge py-10">
      <h1 className="heading-stencil text-3xl text-khaki">Billing</h1>

      <div className="mt-4 rounded-lg border-2 border-edge bg-panel p-4">
        <p className="label-caps text-faded">Current plan</p>
        <p className="mt-1 text-lg text-sand">
          {status === 'active' && 'Pro — active'}
          {status === 'trialing' &&
            (daysLeft > 0
              ? `Free trial — ${daysLeft} day${daysLeft === 1 ? '' : 's'} left`
              : 'Trial ended')}
          {status === 'past_due' && 'Payment past due'}
          {status === 'canceled' && 'Canceled'}
        </p>
      </div>

      {!hasAccess && (
        <p className="mt-4 text-sm text-alert">
          Your access is paused. Pick a plan below to keep running your business.
        </p>
      )}

      {status === 'active' ? (
        <button
          onClick={() => void manage()}
          disabled={busy}
          className="heading-stencil tap-active mt-6 w-full rounded-lg border-2 border-edge py-4 text-sand disabled:opacity-50"
        >
          Manage billing
        </button>
      ) : (
        <div className="mt-6 flex flex-col gap-3">
          {(plans ?? []).map((plan) => (
            <button
              key={plan.id}
              onClick={() => void subscribe(plan.id)}
              disabled={busy}
              className="tap-active flex items-center justify-between rounded-lg border-2 border-blaze bg-panel px-4 py-4 disabled:opacity-50"
            >
              <span className="text-lg text-sand">{plan.name}</span>
              <span className="heading-stencil text-blaze">
                {formatCents(plan.price_cents)}/{plan.interval === 'year' ? 'yr' : 'mo'}
              </span>
            </button>
          ))}
        </div>
      )}

      {error && <p className="mt-4 text-sm text-alert">{error}</p>}

      <div className="mt-10 flex justify-center gap-6">
        {hasAccess && (
          <button
            onClick={async () => {
              await refreshAppState()
              void navigate({ to: '/' })
            }}
            className="tap-active py-2 text-sm text-faded"
          >
            ← Back to app
          </button>
        )}
        <button
          onClick={async () => {
            await signOut()
            void navigate({ to: '/login' })
          }}
          className="tap-active py-2 text-sm text-faded"
        >
          Sign out
        </button>
      </div>
    </div>
  )
}
