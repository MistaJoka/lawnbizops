import { Link, useNavigate } from '@tanstack/react-router'
import { LANES, usePipelineBoard, wipLevel, type LaneDef } from './hooks'
import { QuickAddRow } from './QuickAddJob'
import { CardQuickActions } from './CardQuickActions'
import { SkeletonCard } from '@/components/Skeleton'
import {
  jobQuickActions,
  quoteQuickActions,
  arQuickActions,
  callOnly,
} from './cardActions'
import { JobActions, StatusChip } from '@/features/jobs/JobActions'
import { type JobWithContext } from '@/features/jobs/hooks'
import { type EstimateListRow } from '@/features/estimates/hooks'
import {
  AGING_COLOR,
  agingBucket,
  createInvoiceFromJobs,
  useBusinessSettings,
  type InvoiceBalance,
} from '@/features/invoices/hooks'
import { formatCents, localToday } from '@/lib/format'
import { formatClockTime, formatShortDate } from '@/lib/dates'

export function PipelineBoard() {
  const { lanes, isLoading } = usePipelineBoard()

  return (
    <div className="scroll-hide flex snap-x gap-3 overflow-x-auto px-edge py-4">
      {LANES.map((lane) => (
        <KanbanColumn
          key={lane.id}
          lane={lane}
          count={lanes[lane.id].length}
          loading={isLoading}
        >
          {lane.id === 'quote' &&
            lanes.quote.map((est) => <QuoteCard key={est.id} estimate={est} />)}

          {lane.id === 'scheduled' && (
            <>
              <QuickAddRow />
              {lanes.scheduled.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
              {lanes.scheduled.length === 0 && !isLoading && (
                <p className="py-6 text-center text-xs text-faded">
                  No jobs today — tap + to add one
                </p>
              )}
            </>
          )}

          {lane.id === 'in_progress' &&
            lanes.in_progress.map((job) => <JobCard key={job.id} job={job} />)}

          {lane.id === 'done' &&
            lanes.done.map((job) => (
              <DoneCard key={job.id} job={job} allDone={lanes.done} />
            ))}

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
  loading,
  children,
}: {
  lane: LaneDef
  count: number
  loading: boolean
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
          {loading && count === 0 ? '·' : count}
        </span>
      </div>
      <div className="flex min-h-32 flex-col gap-2">{children}</div>
      {/* Loading → a couple of card placeholders so the board reads as "filling
          in", not "empty". Settled empty lanes keep the plain "Empty" marker. */}
      {loading && count === 0 && lane.id !== 'scheduled' && (
        <div className="flex flex-col gap-2">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}
      {!loading && count === 0 && lane.id !== 'scheduled' && (
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
      <CardQuickActions actions={jobQuickActions(job)} />
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

function toInvoiceJob(j: JobWithContext, clientId: string) {
  return {
    id: j.id,
    title: j.title,
    scheduled_date: j.scheduled_date,
    completed_at: j.completed_at,
    price_cents: j.price_cents,
    property: j.property
      ? {
          client_id: clientId,
          label: j.property.label,
          address_line1: j.property.address_line1,
        }
      : null,
    service: null,
  }
}

function DoneCard({ job, allDone }: { job: JobWithContext; allDone: JobWithContext[] }) {
  const navigate = useNavigate()
  const { data: settings } = useBusinessSettings()
  const client = job.property?.client

  // Other Done jobs for the same client — offer to batch them.
  const siblings = client
    ? allDone.filter((j) => j.id !== job.id && j.property?.client?.id === client.id)
    : []

  async function invoice() {
    if (!client) return

    let jobsToInvoice = [job]
    if (siblings.length > 0) {
      const extraTotal = siblings.reduce((s, j) => s + j.price_cents, 0)
      const batch = window.confirm(
        `Also include ${siblings.length} other done job${siblings.length > 1 ? 's' : ''} for ${client.name}? (+${formatCents(extraTotal)})`,
      )
      if (batch) jobsToInvoice = [job, ...siblings]
    }

    const id = await createInvoiceFromJobs({
      clientId: client.id,
      client: { name: client.name, phone: client.phone },
      jobs: jobsToInvoice.map((j) => toInvoiceJob(j, client.id)),
      extraItems: [],
      defaultDueDays: settings?.default_due_days ?? 15,
    })
    void navigate({ to: '/invoices/$invoiceId', params: { invoiceId: id } })
  }

  return (
    <CardShell job={job}>
      <button
        onClick={() => void invoice()}
        className="heading-stencil tap-active mt-3 min-h-12 w-full rounded-lg bg-blaze px-2 py-3 text-base text-on-cta"
      >
        Invoice →{siblings.length > 0 ? ` (+${siblings.length})` : ''}
      </button>
    </CardShell>
  )
}

function QuoteCard({ estimate }: { estimate: EstimateListRow }) {
  return (
    <div className="card-surface p-3">
      <Link
        to="/estimates/$estimateId"
        params={{ estimateId: estimate.id }}
        className="tap-active block"
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
      <CardQuickActions actions={quoteQuickActions(estimate)} />
    </div>
  )
}

function ArCard({ invoice }: { invoice: InvoiceBalance }) {
  const tint = AGING_COLOR[agingBucket(invoice, localToday())] ?? 'text-sand'
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
      <CardQuickActions actions={arQuickActions(invoice)} />
    </div>
  )
}

function PaidCard({ invoice }: { invoice: InvoiceBalance }) {
  return (
    <div className="card-surface p-3 opacity-70">
      <Link
        to="/invoices/$invoiceId"
        params={{ invoiceId: invoice.invoice_id }}
        className="tap-active block"
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
      <CardQuickActions actions={callOnly(invoice.client?.phone)} />
    </div>
  )
}
