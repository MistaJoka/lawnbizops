import { useRef, useState } from 'react'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  convertToInvoice,
  createJobFromEstimate,
  emailEstimate,
  renewEstimate,
  setEstimateStatus,
  useEstimate,
  type EstimateDetail,
} from '@/features/estimates/hooks'
import {
  deletePhoto,
  uploadPhoto,
  usePhotos,
  type PhotoWithUrl,
} from '@/features/estimates/photos'
import { EstimateStatusChip } from '@/features/estimates/EstimateStatusChip'
import { estimateFilename, shareLink, sharePdf } from '@/features/estimates/share'
import {
  invoiceTotalCents,
  lineTotalCents,
  useBusinessSettings,
} from '@/features/invoices/hooks'
import { Field, TextInput } from '@/components/Field'
import { SkeletonDetail } from '@/components/Skeleton'
import { confirm } from '@/lib/confirm'
import { formatCents, localToday } from '@/lib/format'
import { formatShortDate } from '@/lib/dates'

export const Route = createFileRoute('/_authed/estimates/$estimateId')({
  component: EstimateDetailScreen,
})

function EstimateDetailScreen() {
  const { estimateId } = Route.useParams()
  const navigate = useNavigate()
  const { data: detail, isLoading } = useEstimate(estimateId)
  const { data: settings } = useBusinessSettings()
  const [sharing, setSharing] = useState(false)
  const [converting, setConverting] = useState(false)
  const [renewing, setRenewing] = useState(false)
  const [emailing, setEmailing] = useState(false)
  const [linkMsg, setLinkMsg] = useState<string | null>(null)

  if (!detail) {
    return (
      <div className="px-edge pt-6">
        <Link to="/money" className="inline-block py-2 pr-4 text-sm text-faded">
          ← Money
        </Link>
        {isLoading ? (
          <div className="mt-4">
            <SkeletonDetail />
          </div>
        ) : (
          <p className="mt-16 text-center text-faded">Estimate not found.</p>
        )}
      </div>
    )
  }

  const { estimate, items, client, property } = detail
  const total = invoiceTotalCents(items)

  async function handleSharePdf() {
    if (!detail || !detail.estimate.number || sharing) return
    setSharing(true)
    try {
      const [{ pdf }, { EstimatePdf }, { fetchLogoDataUrl }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('@/features/estimates/EstimatePdf'),
        import('@/features/settings/hooks'),
      ])
      // Resolves to undefined on failure/offline — PDF renders without a logo.
      const logoDataUrl = await fetchLogoDataUrl(settings?.logo_path)
      const blob = await pdf(
        <EstimatePdf
          detail={detail}
          settings={settings ?? null}
          logoDataUrl={logoDataUrl}
        />,
      ).toBlob()
      const shared = await sharePdf(
        blob,
        estimateFilename(detail.estimate.number, detail.client?.name ?? 'Client'),
      )
      if (shared && detail.estimate.status === 'draft') {
        await setEstimateStatus(detail.estimate.id, 'sent')
      }
    } finally {
      setSharing(false)
    }
  }

  async function handleShareApprovalLink() {
    if (!detail) return
    const url = `${window.location.origin}/e/${detail.estimate.approval_token}`
    const outcome = await shareLink(
      url,
      `Your estimate from ${settings?.business_name ?? 'us'} — review and approve:`,
    )
    if (outcome === 'copied') setLinkMsg('Approval link copied')
    else if (outcome === 'failed') setLinkMsg('Could not share the link')
    else setLinkMsg(null)
  }

  async function handleRenew() {
    if (!detail || renewing) return
    setRenewing(true)
    try {
      const id = await renewEstimate(detail)
      void navigate({ to: '/estimates/$estimateId', params: { estimateId: id } })
    } finally {
      setRenewing(false)
    }
  }

  async function handleEmail() {
    if (!detail || !detail.client?.email || emailing) return
    setEmailing(true)
    try {
      await emailEstimate(detail)
    } finally {
      setEmailing(false)
    }
  }

  async function handleConvertToInvoice() {
    if (!detail || detail.linkedInvoiceId || converting) return
    setConverting(true)
    try {
      const id = await convertToInvoice(detail, settings?.default_due_days ?? 14)
      void navigate({ to: '/invoices/$invoiceId', params: { invoiceId: id } })
    } finally {
      setConverting(false)
    }
  }

  return (
    <div className="px-edge pt-6">
      <Link to="/money" className="inline-block py-2 pr-4 text-sm text-faded">
        ← Money
      </Link>

      <div className="mt-2 flex items-start justify-between gap-3">
        <h1 className="heading-stencil min-w-0 text-2xl text-khaki">
          {estimate.number ?? 'pending #'}
        </h1>
        <EstimateStatusChip status={estimate.status} validUntil={estimate.valid_until} />
      </div>
      <p className="mt-1 text-faded">
        Issued {formatShortDate(estimate.issued_at)}
        {estimate.valid_until && ` · valid thru ${formatShortDate(estimate.valid_until)}`}
      </p>

      {client && (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-edge bg-panel px-4 py-4">
          <span className="min-w-0">
            <span className="heading-stencil block text-xs text-faded">Client</span>
            <Link
              to="/clients/$clientId"
              params={{ clientId: client.id }}
              className="mt-1 block truncate text-lg text-sand underline decoration-edge"
            >
              {client.name}
            </Link>
            {property && (
              <span className="mt-1 block truncate text-sm text-faded">
                {property.label || property.address_line1}
              </span>
            )}
          </span>
          {client.phone && (
            <a
              href={`tel:${client.phone}`}
              className="heading-stencil shrink-0 rounded-lg bg-blaze px-4 py-3 text-on-cta"
            >
              📞 Call
            </a>
          )}
        </div>
      )}

      <div className="mt-4 rounded-lg border border-edge bg-panel px-4 py-2">
        {items.map((item) => (
          <div
            key={item.id}
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
            <span className="shrink-0 text-sand">
              {formatCents(lineTotalCents(item))}
            </span>
          </div>
        ))}
        {items.length === 0 && <p className="py-3 text-sm text-faded">No line items.</p>}
      </div>

      <div className="mt-4 flex items-center justify-between rounded-lg border border-edge bg-panel px-4 py-4">
        <span className="heading-stencil text-xs text-faded">Total</span>
        <span className="heading-stencil text-3xl text-sand">{formatCents(total)}</span>
      </div>

      {estimate.notes && (
        <div className="mt-4 rounded-lg border border-edge bg-panel px-4 py-4">
          <p className="heading-stencil text-xs text-faded">Notes</p>
          <p className="mt-1 whitespace-pre-wrap text-sand">{estimate.notes}</p>
        </div>
      )}

      <PhotosSection estimateId={estimate.id} />

      <div className="mt-6 flex flex-col gap-3 pb-8">
        {(estimate.status === 'draft' || estimate.status === 'sent') && (
          <div>
            <button
              type="button"
              disabled={!client?.email || emailing}
              onClick={() => void handleEmail()}
              className={`heading-stencil w-full rounded-lg px-4 py-4 text-lg disabled:opacity-50 ${
                estimate.status === 'draft'
                  ? 'bg-blaze text-on-cta'
                  : 'border border-edge bg-panel text-sand'
              }`}
            >
              {emailing ? 'Queueing…' : 'Email estimate'}
            </button>
            <p className="mt-1 text-center text-xs text-faded">
              {estimate.sent_at
                ? `Emailed ${formatShortDate(estimate.sent_at.slice(0, 10))}`
                : client?.email
                  ? `Sends to ${client.email} with the approval link.`
                  : 'Add an email to the client to send directly.'}
            </p>
          </div>
        )}

        {estimate.status === 'draft' && (
          <button
            type="button"
            onClick={() => void setEstimateStatus(estimate.id, 'sent')}
            className="heading-stencil w-full rounded-lg border border-edge bg-panel px-4 py-4 text-lg text-khaki"
          >
            Mark sent
          </button>
        )}

        {estimate.status === 'sent' && (
          <>
            <div>
              <button
                type="button"
                onClick={() => void handleShareApprovalLink()}
                className="heading-stencil w-full rounded-lg bg-blaze px-4 py-4 text-lg text-on-cta"
              >
                Send approval link
              </button>
              <p className="mt-1 text-center text-xs text-faded">
                {linkMsg ?? 'Customer can approve or decline online — no app needed.'}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => void setEstimateStatus(estimate.id, 'accepted')}
                className="heading-stencil flex-1 rounded-lg border border-edge bg-panel px-4 py-4 text-lg text-go"
              >
                Accepted ✓
              </button>
              <button
                type="button"
                onClick={() => void setEstimateStatus(estimate.id, 'declined')}
                className="heading-stencil flex-1 rounded-lg border border-edge bg-panel px-4 py-4 text-lg text-alert"
              >
                Declined
              </button>
            </div>
          </>
        )}

        {estimate.status === 'accepted' && (
          <>
            <CreateJobCard detail={detail} />
            {property && (
              <Link
                to="/schedules/new"
                search={{ propertyId: property.id, priceCents: total }}
                className="heading-stencil w-full rounded-lg border border-edge bg-panel px-4 py-4 text-center text-lg text-sand"
              >
                Create recurring schedule
              </Link>
            )}
            <div>
              <button
                type="button"
                disabled={detail.linkedInvoiceId !== null || converting}
                onClick={() => void handleConvertToInvoice()}
                className="heading-stencil w-full rounded-lg bg-blaze px-4 py-4 text-lg text-on-cta disabled:opacity-50"
              >
                Convert to invoice
              </button>
              {detail.linkedInvoiceId && (
                <p className="mt-1 text-center text-xs text-faded">
                  Already invoiced —{' '}
                  <Link
                    to="/invoices/$invoiceId"
                    params={{ invoiceId: detail.linkedInvoiceId }}
                    className="underline"
                  >
                    view invoice
                  </Link>
                </p>
              )}
            </div>
          </>
        )}

        {(estimate.status === 'declined' ||
          estimate.status === 'expired' ||
          (estimate.status === 'sent' &&
            estimate.valid_until !== null &&
            estimate.valid_until < localToday())) && (
          <button
            type="button"
            disabled={renewing}
            onClick={() => void handleRenew()}
            className="heading-stencil w-full rounded-lg border border-edge bg-panel px-4 py-4 text-lg text-khaki disabled:opacity-50"
          >
            {renewing ? 'Renewing…' : 'Renew estimate'}
          </button>
        )}

        <div>
          <button
            type="button"
            disabled={!estimate.number || sharing}
            onClick={() => void handleSharePdf()}
            className="heading-stencil w-full rounded-lg border border-edge bg-panel px-4 py-4 text-lg text-sand disabled:opacity-50"
          >
            {sharing ? 'Building PDF…' : 'Share PDF'}
          </button>
          {!estimate.number && (
            <p className="mt-1 text-center text-xs text-faded">
              Syncs first — number pending
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function CreateJobCard({ detail }: { detail: EstimateDetail }) {
  const navigate = useNavigate()
  const [date, setDate] = useState(localToday())
  const [creating, setCreating] = useState(false)
  const hasProperty = detail.property !== null

  async function handleCreateJob() {
    if (!hasProperty || creating) return
    setCreating(true)
    try {
      const jobId = await createJobFromEstimate(detail, date)
      void navigate({ to: '/jobs/$jobId', params: { jobId } })
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="rounded-lg border border-edge bg-panel px-4 py-4">
      <Field label="Job date">
        <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </Field>
      <button
        type="button"
        disabled={!hasProperty || creating}
        onClick={() => void handleCreateJob()}
        className="heading-stencil mt-3 w-full rounded-lg border border-go px-4 py-4 text-lg text-go disabled:opacity-50"
      >
        Create job
      </button>
      {!hasProperty && (
        <div className="mt-2 text-center">
          <p className="text-xs text-faded">Needs a property — estimate has none.</p>
          {detail.client && (
            <Link
              to="/properties/new"
              search={{ clientId: detail.client.id }}
              className="heading-stencil mt-1 inline-block text-xs text-blaze"
            >
              + Add property
            </Link>
          )}
        </div>
      )}
    </div>
  )
}

function PhotosSection({ estimateId }: { estimateId: string }) {
  const { data: photos } = usePhotos('estimate', estimateId)
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const online = navigator.onLine

  async function handleFile(file: File | undefined) {
    if (!file || uploading) return
    setUploading(true)
    setError('')
    try {
      await uploadPhoto('estimate', estimateId, file)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed.')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function handleDelete(photo: PhotoWithUrl) {
    if (
      !(await confirm({
        title: 'Delete this photo?',
        confirmLabel: 'Delete',
        destructive: true,
      }))
    )
      return
    setError('')
    try {
      await deletePhoto(photo)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed.')
    }
  }

  return (
    <div className="mt-4 rounded-lg border border-edge bg-panel px-4 py-4">
      <p className="heading-stencil text-xs text-faded">Photos</p>

      {(photos ?? []).length > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-2">
          {(photos ?? []).map((photo) => (
            <div key={photo.id} className="relative aspect-square">
              {photo.url ? (
                <img
                  src={photo.url}
                  alt="Estimate photo"
                  className="h-full w-full rounded-lg border border-edge object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center rounded-lg border border-edge text-xs text-faded">
                  No link
                </div>
              )}
              <button
                type="button"
                onClick={() => void handleDelete(photo)}
                aria-label="Delete photo"
                className="heading-stencil absolute top-1 right-1 flex h-7 w-7 items-center justify-center rounded-full bg-canvas/80 text-alert"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />
      <button
        type="button"
        disabled={!online || uploading}
        onClick={() => fileRef.current?.click()}
        className="heading-stencil mt-3 w-full rounded-lg border border-edge px-4 py-4 text-sand disabled:opacity-50"
      >
        {uploading ? 'Uploading…' : '+ Add photo'}
      </button>
      {!online && (
        <p className="mt-1 text-center text-xs text-faded">Photos need a connection</p>
      )}
      {error && <p className="mt-1 text-center text-xs text-alert">{error}</p>}
    </div>
  )
}
