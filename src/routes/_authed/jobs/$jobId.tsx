import { useRef, useState } from 'react'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { JobChecklist } from '@/features/jobs/JobChecklist'
import { setJobStatus, useJob } from '@/features/jobs/hooks'
import { JobActions, StatusChip } from '@/features/jobs/JobActions'
import { JobStepper } from '@/components/JobStepper'
import { SkeletonDetail } from '@/components/Skeleton'
import { DangerButton } from '@/components/Field'
import { confirm } from '@/lib/confirm'
import { deletePhoto, uploadPhoto, usePhotos } from '@/features/estimates/photos'
import { jobPipelineStage } from '@/lib/jobPipeline'
import { formatCents } from '@/lib/format'
import { formatClockTime, formatShortDate } from '@/lib/dates'

export const Route = createFileRoute('/_authed/jobs/$jobId')({
  component: JobDetailScreen,
})

function JobDetailScreen() {
  const { jobId } = Route.useParams()
  const navigate = useNavigate()
  const { data: job, isLoading } = useJob(jobId)

  if (!job) {
    return (
      <div className="px-edge pt-6">
        <Link to="/" className="inline-block py-2 pr-4 text-sm text-faded">
          ← Today
        </Link>
        {isLoading ? (
          <div className="mt-4">
            <SkeletonDetail />
          </div>
        ) : (
          <p className="mt-16 text-center text-faded">Job not found.</p>
        )}
      </div>
    )
  }

  const p = job.property
  const client = p?.client
  const address = p ? [p.address_line1, p.city].filter(Boolean).join(', ') : ''
  const canInvoice = job.status === 'done'

  async function handleCancel() {
    if (!job) return
    if (
      !(await confirm({
        title: 'Cancel this job?',
        body: 'It comes off the schedule for good.',
        confirmLabel: 'Cancel job',
        cancelLabel: 'Keep it',
        destructive: true,
      }))
    )
      return
    await setJobStatus(job, 'canceled')
    void navigate({ to: '/' })
  }

  return (
    <div className="px-edge pt-6 pb-24">
      <Link to="/" className="inline-block py-2 pr-4 text-sm text-faded">
        ← Today
      </Link>

      <div className="mt-4">
        <JobStepper stage={jobPipelineStage(job.status)} />
      </div>

      <div className="mt-4 flex items-start justify-between gap-3">
        <h1 className="heading-stencil min-w-0 text-2xl text-khaki">
          {job.title || 'Job'}
        </h1>
        <StatusChip status={job.status} />
      </div>
      <p className="mt-1 text-faded">
        {formatShortDate(job.scheduled_date)}
        {job.start_time && ` · ${formatClockTime(job.start_time)}`}
        {job.schedule_id && ' · recurring'}
      </p>

      <div className="card-surface mt-4 p-4">
        <p className="label-caps text-faded">Price</p>
        <p className="heading-stencil mt-1 text-3xl text-sand">
          {formatCents(job.price_cents)}
        </p>
      </div>

      <JobActions job={job} />

      {canInvoice && client && (
        <Link
          to="/invoices/new"
          search={{ clientId: client.id }}
          className="heading-stencil tap-active mt-4 block rounded-lg bg-go py-4 text-center text-lg text-canvas"
        >
          Create invoice
        </Link>
      )}

      {client && (
        <div className="card-surface mt-4 flex items-center justify-between gap-3 p-4">
          <span className="min-w-0">
            <span className="label-caps text-faded">Client</span>
            <Link
              to="/clients/$clientId"
              params={{ clientId: client.id }}
              className="mt-1 block truncate text-lg text-sand underline decoration-edge"
            >
              {client.name}
            </Link>
          </span>
          {client.phone && (
            <a
              href={`tel:${client.phone}`}
              className="heading-stencil shrink-0 rounded-lg bg-blaze px-4 py-3 text-on-cta"
            >
              Call
            </a>
          )}
        </div>
      )}

      {p && (
        <div className="card-surface mt-4 p-4">
          <p className="label-caps text-faded">Property</p>
          <Link
            to="/properties/$propertyId"
            params={{ propertyId: p.id }}
            className="mt-1 block text-lg text-sand underline decoration-edge"
          >
            {p.label || 'Property'}
          </Link>
          {address && (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
              target="_blank"
              rel="noreferrer"
              className="heading-stencil tap-active mt-3 inline-block rounded-lg border-2 border-edge px-4 py-2 text-sm text-sand"
            >
              Open maps
            </a>
          )}
        </div>
      )}

      {p?.gate_code && (
        <div className="mt-4 rounded-lg border-2 border-blaze bg-panel px-4 py-4">
          <p className="label-caps text-faded">Gate code</p>
          <p className="heading-stencil mt-1 text-3xl text-blaze">{p.gate_code}</p>
        </div>
      )}

      {p?.notes && (
        <div className="card-surface mt-4 p-4">
          <p className="label-caps text-faded">Property notes</p>
          <p className="mt-1 whitespace-pre-wrap text-sand">{p.notes}</p>
        </div>
      )}

      {job.notes && (
        <div className="card-surface mt-4 p-4">
          <p className="label-caps text-faded">Scope & materials</p>
          <p className="mt-1 whitespace-pre-wrap text-sand">{job.notes}</p>
        </div>
      )}

      {(job.status === 'scheduled' || job.status === 'in_progress') && (
        <JobChecklist job={job} />
      )}

      <PhotosSection jobId={jobId} />

      {(job.status === 'scheduled' || job.status === 'in_progress') && (
        <div className="mt-12">
          <DangerButton onClick={() => void handleCancel()}>Cancel job</DangerButton>
        </div>
      )}
    </div>
  )
}

function PhotosSection({ jobId }: { jobId: string }) {
  const { data: photos } = usePhotos('job', jobId)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    setUploading(true)
    try {
      await uploadPhoto('job', jobId, file)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  async function handleDelete(photo: Parameters<typeof deletePhoto>[0]) {
    if (
      !(await confirm({
        title: 'Delete this photo?',
        confirmLabel: 'Delete',
        destructive: true,
      }))
    )
      return
    try {
      await deletePhoto(photo)
    } catch {
      setError('Delete failed — try again')
    }
  }

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between">
        <p className="label-caps text-faded">Photos</p>
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="heading-stencil tap-active rounded-lg border-2 border-edge px-3 py-1.5 text-xs text-sand disabled:opacity-40"
        >
          {uploading ? 'Uploading…' : '+ Photo'}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => void handleFile(e)}
        />
      </div>

      {error && <p className="mt-2 text-sm text-alert">{error}</p>}

      {(photos ?? []).length > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-2">
          {(photos ?? []).map((photo) => (
            <button
              key={photo.id}
              type="button"
              onClick={() => void handleDelete(photo)}
              aria-label="Delete photo"
              className="tap-active relative aspect-square overflow-hidden rounded-lg border-2 border-edge"
            >
              {photo.url ? (
                <img
                  src={photo.url}
                  alt="Job photo"
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-2xl">
                  🖼
                </span>
              )}
              <span className="absolute bottom-0 right-0 rounded-tl bg-black/60 px-1 py-0.5 text-[10px] text-white">
                ✕
              </span>
            </button>
          ))}
        </div>
      )}

      {(photos ?? []).length === 0 && !uploading && (
        <p className="mt-2 text-sm text-faded">
          Tap + Photo to document the work — before/after, scope, issues.
        </p>
      )}
    </div>
  )
}
