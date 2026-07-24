import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import {
  approvalTotalCents,
  fetchEstimateByToken,
  respondToEstimate,
  type ApprovalBundle,
} from '@/features/estimates/approval'
import { SkeletonDetail } from '@/components/Skeleton'
import { formatCents, localToday } from '@/lib/format'
import { formatShortDate } from '@/lib/dates'
import { useDocumentTitle } from '@/lib/useDocumentTitle'

export const Route = createFileRoute('/e/$token')({
  component: ApprovalPage,
})

function ApprovalPage() {
  const { token } = Route.useParams()
  const { data, isLoading, isError } = useQuery({
    queryKey: ['approval', token],
    queryFn: () => fetchEstimateByToken(token),
    retry: false,
    staleTime: Infinity,
  })

  useDocumentTitle(
    data?.business_name
      ? `Estimate ${data.number ?? ''} · ${data.business_name}`.trim()
      : null,
  )

  return (
    <div className="mx-auto min-h-dvh max-w-md px-edge py-10">
      {isLoading ? (
        <div className="mt-10">
          <SkeletonDetail />
        </div>
      ) : isError || !data ? (
        <InvalidLink />
      ) : (
        <Approval bundle={data} token={token} />
      )}
    </div>
  )
}

function InvalidLink() {
  return (
    <div className="mt-20 text-center">
      <h1 className="heading-stencil text-2xl text-sand">Link not found</h1>
      <p className="mt-3 text-faded">
        This estimate link is no longer valid. Please contact the business that sent it
        for an up-to-date copy.
      </p>
    </div>
  )
}

function Approval({ bundle, token }: { bundle: ApprovalBundle; token: string }) {
  // Seed from the loaded status so a re-opened link shows the prior answer.
  const [status, setStatus] = useState(bundle.status)
  const [busy, setBusy] = useState<'accept' | 'decline' | null>(null)
  const [error, setError] = useState(false)
  // First "Decline" tap reveals an optional why — second tap confirms.
  const [declining, setDeclining] = useState(false)
  const [declineReason, setDeclineReason] = useState('')

  const total = approvalTotalCents(bundle.items)
  const expired =
    status === 'sent' && bundle.valid_until !== null && bundle.valid_until < localToday()
  const canRespond = status === 'sent' && !expired

  async function respond(action: 'accept' | 'decline') {
    setBusy(action)
    setError(false)
    try {
      const next = await respondToEstimate(
        token,
        action,
        action === 'decline' ? declineReason : '',
      )
      setStatus(next)
    } catch {
      setError(true)
    } finally {
      setBusy(null)
    }
  }

  return (
    <div>
      <header className="text-center">
        <p className="heading-stencil text-xl text-sand">
          {bundle.business_name || 'Your estimate'}
        </p>
        <p className="mt-1 text-sm text-faded">
          Estimate {bundle.number ?? ''} · {formatShortDate(bundle.issued_at)}
        </p>
      </header>

      <StatusBanner status={status} expired={expired} />

      <div className="mt-6 rounded-lg border-2 border-edge bg-panel px-4 py-2">
        {bundle.items.map((item, i) => (
          <div
            key={i}
            className="flex items-start justify-between gap-3 border-b border-edge py-3 last:border-b-0"
          >
            <span className="min-w-0">
              <span className="block text-sand">{item.description}</span>
              {item.quantity !== 1 && (
                <span className="block text-sm text-faded">
                  {item.quantity} × {formatCents(item.unit_price_cents)}
                </span>
              )}
            </span>
            <span className="shrink-0 text-right tabular-nums text-sand">
              {formatCents(Math.round(item.quantity * item.unit_price_cents))}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between px-1">
        <span className="heading-stencil text-faded">Total</span>
        <span className="heading-stencil text-3xl tabular-nums text-sand">
          {formatCents(total)}
        </span>
      </div>

      {bundle.valid_until && (
        <p className="mt-2 px-1 text-sm text-faded">
          Valid through {formatShortDate(bundle.valid_until)}
        </p>
      )}

      {bundle.notes && (
        <div className="mt-4 rounded-lg border border-edge bg-panel px-4 py-4">
          <p className="whitespace-pre-wrap text-sand">{bundle.notes}</p>
        </div>
      )}

      {canRespond && (
        <div className="mt-8 flex flex-col gap-3">
          {error && (
            <p className="text-center text-sm text-alert">
              Something went wrong — please try again.
            </p>
          )}
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void respond('accept')}
            className="heading-stencil tap-active w-full rounded-lg bg-go px-4 py-5 text-xl text-canvas disabled:opacity-50"
          >
            {busy === 'accept' ? 'Approving…' : 'Approve this estimate'}
          </button>
          {declining && (
            <textarea
              rows={2}
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder="Mind sharing why? (optional)"
              aria-label="Reason for declining (optional)"
              className="w-full rounded-lg border-2 border-edge bg-panel px-4 py-3 text-sand placeholder:text-faded focus:border-blaze focus:outline-none"
            />
          )}
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => (declining ? void respond('decline') : setDeclining(true))}
            className="heading-stencil tap-active w-full rounded-lg border-2 border-edge px-4 py-4 text-lg text-alert disabled:opacity-50"
          >
            {busy === 'decline'
              ? 'Declining…'
              : declining
                ? 'Confirm decline'
                : 'Decline'}
          </button>
        </div>
      )}
    </div>
  )
}

function StatusBanner({ status, expired }: { status: string; expired: boolean }) {
  if (expired) {
    return (
      <Banner tone="muted">
        This estimate has expired. Contact the business to renew it.
      </Banner>
    )
  }
  if (status === 'accepted') {
    return (
      <Banner tone="go">Approved — thank you! The business has been notified.</Banner>
    )
  }
  if (status === 'declined') {
    return <Banner tone="alert">You declined this estimate.</Banner>
  }
  if (status === 'expired') {
    return <Banner tone="muted">This estimate has expired.</Banner>
  }
  return null
}

function Banner({
  tone,
  children,
}: {
  tone: 'go' | 'alert' | 'muted'
  children: string
}) {
  const cls =
    tone === 'go'
      ? 'border-go text-go'
      : tone === 'alert'
        ? 'border-alert text-alert'
        : 'border-edge text-faded'
  return (
    <div className={`mt-6 rounded-lg border-2 bg-panel px-4 py-3 text-center ${cls}`}>
      {children}
    </div>
  )
}
