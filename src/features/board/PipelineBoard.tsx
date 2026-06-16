import { Link, useNavigate } from '@tanstack/react-router'
import { LANES, usePipelineBoard, wipLevel, type LaneDef } from './hooks'
import { QuickAddRow } from './QuickAddJob'
import { JobActions, StatusChip } from '@/features/jobs/JobActions'
import { type JobWithContext } from '@/features/jobs/hooks'
import { type EstimateListRow } from '@/features/estimates/hooks'
import {
  agingBucket,
  createInvoiceFromJobs,
  useBusinessSettings,
  type InvoiceBalance,
} from '@/features/invoices/hooks'
import { formatCents, localToday } from '@/lib/format'
import { formatClockTime, formatShortDate } from '@/lib/dates'

const AGING_TINT: Record<string, string> = {
  current: 'text-sand',
  '1-30': 'text-sand',
  '31-60': 'text-khaki',
  '61-90': 'text-khaki',
  '90+': 'text-alert',
}

export function PipelineBoard() {
  const { lanes } = usePipelineBoard()
  const counts: Record<string, number> = {
    quote: lanes.quote.length,
    scheduled: lanes.scheduled.length,
    in_progress: lanes.in_progress.length,
    done: lanes.done.length,
    ar: lanes.ar.length,
    paid: lanes.paid.length,
  }

  return (
    <div className="scroll-hide flex snap-x gap-3 overflow-x-auto px-edge py-4">
      {LANES.map((lane) => (
        <KanbanColumn key={lane.id} lane={lane} count={counts[lane.id]}>
          {lane.id === 'quote' &&
            lanes.quote.map((est) => <QuoteCard key={est.id} estimate={est} />)}

          {lane.id === 'scheduled' && (
            <>
              <QuickAddRow />
              {lanes.scheduled.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </>
          )}

          {lane.id === 'in_progress' &&
            lanes.in_progress.map((job) => <JobCard key={job.id} job={job} />)}

          {lane.id === 'done' &&
            lanes.done.map((job) => <DoneCard key={job.id} job={job} />)}

          {lane.id === 'ar' &&
            lanes.ar.map((inv) => <ArCard key={inv.invoice_id} invoice={inv} />)}

          {lane.id === 'paid' &&
            lanes.paid.map((inv) => <PaidCard key={inv.invoice_id} invoice={inv} />)}
        </KanbanColumn>
      ))}
    </div>
  )
}

function KanbanColumn({
  lane,
  count,
  children,
}: {
  lane: LaneDef
  count: number
  children: React.ReactNode
}) {
  const over = wipLevel(lane.id, count) === 'over'
  return (
    <section
      className={`flex w-[82vw] max-w-sm shrink-0 snap-center flex-col rounded-xl border-2 bg-surface-low p-3 ${lane.tint}`}
    >
      <div className="mb-3 flex items-center justify-between">
        <h2 className="heading-stencil text-sm text-sand">{lane.title}</h2>
        <span
          title={over ? 'Over the WIP cap — clear this lane' : undefined}
          className={`label-caps rounded px-1.5 ${over ? 'bg-alert/20 text-alert' : 'text-faded'}`}
        >
          {count}
        </span>
      </div>
      <div className="flex min-h-32 flex-col gap-2">{children}</div>
      {count === 0 && lane.id !== 'scheduled' && (
        <p className="py-8 text-center text-sm text-faded">Empty</p>
      )}
    </section>
  )
}

function CardShell({
  job,
  children,
}: {
  job: JobWithContext
  children?: React.ReactNode
}) {
  const p = job.property
  return (
    <div className="card-surface p-3">
      <Link to="/jobs/$jobId" params={{ jobId: job.id }} className="block">
        <div className="flex items-start justify-between gap-2">
          <span className="min-w-0 truncate font-display text-base font-semibold text-sand">
            {p?.client?.name ?? 'Job'}
          </span>
          <StatusChip status={job.status} />
        </div>
        <p className="mt-1 truncate text-sm text-muted">
          {job.title || p?.label}
          {' · '}
          {formatShortDate(job.scheduled_date)}
          {job.start_time && ` · ${formatClockTime(job.start_time)}`}
        </p>
        <p className="mt-1 text-sm text-faded">{formatCents(job.price_cents)}</p>
      </Link>
      {children}
    </div>
  )
}

function JobCard({ job }: { job: JobWithContext }) {
  return (
    <CardShell job={job}>
      <JobActions job={job} />
    </CardShell>
  )
}

function DoneCard({ job }: { job: JobWithContext }) {
  const navigate = useNavigate()
  const { data: settings } = useBusinessSettings()

  async function invoice() {
    const client = job.property?.client
    if (!client) return
    const id = await createInvoiceFromJobs({
      clientId: client.id,
      client: { name: client.name, phone: client.phone },
      jobs: [
        {
          id: job.id,
          title: job.title,
          scheduled_date: job.scheduled_date,
          completed_at: job.completed_at,
          price_cents: job.price_cents,
          property: job.property
            ? {
                client_id: client.id,
                label: job.property.label,
                address_line1: job.property.address_line1,
              }
            : null,
          service: null,
        },
      ],
      extraItems: [],
      defaultDueDays: settings?.default_due_days ?? 15,
    })
    // createInvoiceFromJobs flips the job to 'invoiced' across all caches.
    void navigate({ to: '/invoices/$invoiceId', params: { invoiceId: id } })
  }

  return (
    <CardShell job={job}>
      <button
        onClick={() => void invoice()}
        className="heading-stencil tap-active mt-3 min-h-12 w-full rounded-lg bg-blaze px-2 py-3 text-base text-on-cta"
      >
        Invoice →
      </button>
    </CardShell>
  )
}

function QuoteCard({ estimate }: { estimate: EstimateListRow }) {
  return (
    <Link
      to="/estimates/$estimateId"
      params={{ estimateId: estimate.id }}
      className="card-surface tap-active block p-3"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="min-w-0 truncate font-display text-base font-semibold text-sand">
          {estimate.client?.name ?? 'Estimate'}
        </span>
        <span className="status-badge shrink-0 rounded bg-olive px-2 py-0.5 text-sand">
          {estimate.status}
        </span>
      </div>
      <p className="mt-1 text-sm text-muted">{formatCents(estimate.total_cents)}</p>
    </Link>
  )
}

function ArCard({ invoice }: { invoice: InvoiceBalance }) {
  const tint = AGING_TINT[agingBucket(invoice, localToday())] ?? 'text-sand'
  return (
    <div className="card-surface p-3">
      <Link
        to="/invoices/$invoiceId"
        params={{ invoiceId: invoice.invoice_id }}
        className="block"
      >
        <div className="flex items-start justify-between gap-2">
          <span className="min-w-0 truncate font-display text-base font-semibold text-sand">
            {invoice.client?.name ?? 'Client'}
          </span>
          <span className="heading-stencil shrink-0 text-sand">
            {invoice.number ?? 'pending'}
          </span>
        </div>
        <p className={`mt-1 text-sm ${tint}`}>
          {formatCents(invoice.balance_cents)} due
          {invoice.due_at && ` · due ${formatShortDate(invoice.due_at)}`}
        </p>
      </Link>
      <Link
        to="/invoices/$invoiceId"
        params={{ invoiceId: invoice.invoice_id }}
        className="heading-stencil tap-active mt-3 block min-h-12 rounded-lg border-2 border-blaze px-2 py-3 text-center text-base text-blaze"
      >
        Record payment
      </Link>
    </div>
  )
}

function PaidCard({ invoice }: { invoice: InvoiceBalance }) {
  return (
    <Link
      to="/invoices/$invoiceId"
      params={{ invoiceId: invoice.invoice_id }}
      className="card-surface tap-active block p-3 opacity-70"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="min-w-0 truncate font-display text-base font-semibold text-sand">
          {invoice.client?.name ?? 'Client'}
        </span>
        <span className="status-badge shrink-0 rounded bg-go px-2 py-0.5 text-canvas">
          paid
        </span>
      </div>
      <p className="mt-1 text-sm text-faded">{formatCents(invoice.total_cents)}</p>
    </Link>
  )
}
