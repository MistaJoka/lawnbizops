import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { setJobStatus, useJob } from '@/features/jobs/hooks'
import { JobActions, StatusChip } from '@/features/jobs/JobActions'
import { formatCents } from '@/lib/format'
import { formatShortDate } from '@/lib/dates'

export const Route = createFileRoute('/_authed/jobs/$jobId')({
  component: JobDetailScreen,
})

function JobDetailScreen() {
  const { jobId } = Route.useParams()
  const navigate = useNavigate()
  const { data: job, isLoading } = useJob(jobId)

  if (!job) {
    return (
      <div className="px-4 pt-6">
        <Link to="/" className="text-sm text-faded">
          ← Today
        </Link>
        <p className="mt-16 text-center text-faded">
          {isLoading ? 'Loading…' : 'Job not found.'}
        </p>
      </div>
    )
  }

  const p = job.property
  const client = p?.client
  const address = p ? [p.address_line1, p.city].filter(Boolean).join(', ') : ''

  async function handleCancel() {
    if (!job) return
    if (!window.confirm('Cancel this job? It comes off the schedule for good.')) return
    await setJobStatus(job, 'canceled')
    void navigate({ to: '/' })
  }

  return (
    <div className="px-4 pt-6">
      <Link to="/" className="text-sm text-faded">
        ← Today
      </Link>

      <div className="mt-2 flex items-start justify-between gap-3">
        <h1 className="heading-stencil min-w-0 text-2xl text-khaki">
          {job.title || 'Job'}
        </h1>
        <StatusChip status={job.status} />
      </div>
      <p className="mt-1 text-faded">
        {formatShortDate(job.scheduled_date)}
        {job.schedule_id && ' · recurring'}
      </p>

      <div className="mt-4 rounded-lg border border-edge bg-panel px-4 py-4">
        <p className="heading-stencil text-xs text-faded">Price</p>
        <p className="heading-stencil mt-1 text-3xl text-sand">
          {formatCents(job.price_cents)}
        </p>
      </div>

      <JobActions job={job} />

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
          </span>
          {client.phone && (
            <a
              href={`tel:${client.phone}`}
              className="heading-stencil shrink-0 rounded-lg bg-blaze px-4 py-3 text-canvas"
            >
              📞 Call
            </a>
          )}
        </div>
      )}

      {p && (
        <div className="mt-4 rounded-lg border border-edge bg-panel px-4 py-4">
          <p className="heading-stencil text-xs text-faded">Property</p>
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
              className="mt-2 block text-faded underline decoration-edge"
            >
              {address}
            </a>
          )}
        </div>
      )}

      {p?.gate_code && (
        <div className="mt-4 rounded-lg border border-blaze bg-panel px-4 py-4">
          <p className="heading-stencil text-xs text-faded">Gate code</p>
          <p className="heading-stencil mt-1 text-3xl text-blaze">{p.gate_code}</p>
        </div>
      )}

      {p?.notes && (
        <div className="mt-4 rounded-lg border border-edge bg-panel px-4 py-4">
          <p className="heading-stencil text-xs text-faded">Property notes</p>
          <p className="mt-1 whitespace-pre-wrap text-sand">{p.notes}</p>
        </div>
      )}

      {job.notes && (
        <div className="mt-4 rounded-lg border border-edge bg-panel px-4 py-4">
          <p className="heading-stencil text-xs text-faded">Job notes</p>
          <p className="mt-1 whitespace-pre-wrap text-sand">{job.notes}</p>
        </div>
      )}

      {(job.status === 'scheduled' || job.status === 'in_progress') && (
        <button
          onClick={() => void handleCancel()}
          className="heading-stencil mx-auto mt-12 block rounded-lg border border-edge px-6 py-3 text-alert"
        >
          Cancel job
        </button>
      )}
    </div>
  )
}
