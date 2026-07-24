import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import {
  LANES,
  laneSummaries,
  usePipelineBoard,
  wipLevel,
  type LaneDef,
  type LaneId,
  type LaneSummary,
} from './hooks'
import { QuickAddRow } from './QuickAddJob'
import { CardQuickActions } from './CardQuickActions'
import { SkeletonCard } from '@/components/Skeleton'
import { confirm } from '@/lib/confirm'
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
import { formatCents, formatCentsShort, localToday } from '@/lib/format'
import { formatClockTime, formatShortDate } from '@/lib/dates'

const laneDomId = (id: LaneId) => `board-lane-${id}`

export function PipelineBoard() {
  const { lanes, isLoading } = usePipelineBoard()
  const summaries = laneSummaries(lanes)
  const rowRef = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState<LaneId>(LANES[0].id)

  // Scroll-spy: highlight the nav tile for whichever lane sits nearest the
  // viewport center, so you always know where you are in the horizontally-
  // scrolled board. A scroll listener (vs IntersectionObserver) is deterministic
  // and also fires on the programmatic jump that sets scrollLeft.
  useEffect(() => {
    const row = rowRef.current
    if (!row) return
    const onScroll = () => {
      const rowRect = row.getBoundingClientRect()
      const mid = rowRect.width / 2
      let best = LANES[0].id
      let bestDist = Infinity
      for (const lane of LANES) {
        const el = document.getElementById(laneDomId(lane.id))
        if (!el) continue
        const r = el.getBoundingClientRect()
        const center = r.left - rowRect.left + r.width / 2
        const dist = Math.abs(center - mid)
        if (dist < bestDist) {
          bestDist = dist
          best = lane.id
        }
      }
      setActive(best)
    }
    onScroll()
    row.addEventListener('scroll', onScroll, { passive: true })
    return () => row.removeEventListener('scroll', onScroll)
  }, [])

  // On first load, land on the first lane that actually has cards (usually
  // today's Scheduled work) instead of the typically-empty Quote lane that sits
  // at scrollLeft 0 — so the board opens on real work, not an empty column.
  const didInitialJump = useRef(false)
  useEffect(() => {
    if (isLoading || didInitialJump.current) return
    const firstNonEmpty = LANES.find((l) => summaries[l.id].count > 0)
    // Wait until cards actually exist before latching — otherwise an early
    // empty render burns the one-shot before today's work has loaded.
    if (!firstNonEmpty) return
    didInitialJump.current = true
    if (firstNonEmpty.id !== LANES[0].id) {
      requestAnimationFrame(() => scrollToLane(firstNonEmpty.id))
    }
  }, [isLoading, summaries])

  function scrollToLane(id: LaneId) {
    const el = document.getElementById(laneDomId(id))
    const row = rowRef.current
    if (!el || !row) return
    // Center the lane horizontally in the scroll row. scrollIntoView won't move
    // an overflow-x container reliably, so set scrollLeft directly.
    const offset = el.getBoundingClientRect().left - row.getBoundingClientRect().left
    const target = row.scrollLeft + offset - (row.clientWidth - el.clientWidth) / 2
    // Instant, not smooth: smooth scrollTo is unreliable on a scroll-snap (snap-x)
    // container — the snap cancels the animation. A direct jump always lands.
    row.scrollLeft = Math.max(0, target)
    // Update the highlight directly: a programmatic scrollLeft change doesn't
    // reliably fire 'scroll', and we already know the destination.
    setActive(id)
  }

  return (
    <div className="flex flex-col">
      <LaneNav summaries={summaries} active={active} onJump={scrollToLane} />
      <div
        ref={rowRef}
        className="scroll-hide flex snap-x items-start gap-3 overflow-x-auto px-edge pt-1 pb-4"
      >
        {LANES.map((lane) => (
          <KanbanColumn
            key={lane.id}
            lane={lane}
            summary={summaries[lane.id]}
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
    </div>
  )
}

/**
 * Pipeline-at-a-glance: a compact 3×2 grid of every lane's count + dollar value,
 * so the whole quote→cash pipeline is visible without scrolling six wide
 * columns. Each tile is a jump button that snaps its lane into view — dense
 * overview, one-tap navigation.
 */
function LaneNav({
  summaries,
  active,
  onJump,
}: {
  summaries: Record<LaneId, LaneSummary>
  active: LaneId
  onJump: (id: LaneId) => void
}) {
  return (
    <div className="grid grid-cols-3 gap-2 px-edge pt-4">
      {LANES.map((lane) => {
        const s = summaries[lane.id]
        const isActive = lane.id === active
        return (
          <button
            key={lane.id}
            type="button"
            onClick={() => onJump(lane.id)}
            aria-label={`${lane.title}: ${s.count} item${s.count === 1 ? '' : 's'}, ${formatCents(s.valueCents)}. Jump to lane.`}
            aria-current={isActive ? 'true' : undefined}
            className={`tap-active rounded-lg border px-2 py-1.5 text-left transition-colors ${
              isActive ? 'border-blaze bg-surface-high' : `${lane.tint} bg-surface-low`
            }`}
          >
            <span className="label-caps block truncate text-[11px] text-faded">
              {lane.short ?? lane.title}
            </span>
            <span className="mt-0.5 block truncate text-sm text-sand">
              <span className="font-semibold">{s.count}</span>
              {s.valueCents > 0 && (
                <span
                  className={`text-xs ${
                    lane.id === 'done' || lane.id === 'paid' ? 'text-go' : 'text-faded'
                  }`}
                >
                  {' '}
                  · {formatCentsShort(s.valueCents)}
                </span>
              )}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function KanbanColumn({
  lane,
  summary,
  loading,
  children,
}: {
  lane: LaneDef
  summary: LaneSummary
  loading: boolean
  children: React.ReactNode
}) {
  const count = summary.count
  const over = wipLevel(lane.id, count) === 'over'
  return (
    <section
      id={laneDomId(lane.id)}
      className={`flex w-[80vw] max-w-sm shrink-0 snap-center flex-col rounded-lg border bg-surface-low p-3 ${lane.tint}`}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="heading-stencil min-w-0 truncate text-sm text-sand">
          {lane.title}
        </h2>
        <div className="flex shrink-0 items-center gap-2">
          {/* Lane money total — the dense, at-a-glance "how much $ is in this
              stage" a contractor actually wants. */}
          {summary.valueCents > 0 && (
            <span className="heading-stencil text-xs text-faded tabular-nums">
              {formatCentsShort(summary.valueCents)}
            </span>
          )}
          <span
            title={over ? 'Over the WIP cap — clear this lane' : undefined}
            className={`label-caps rounded px-1.5 tabular-nums ${over ? 'bg-alert/20 text-alert' : 'text-faded'}`}
          >
            {loading && count === 0 ? '·' : count}
          </span>
        </div>
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
        {job.price_cents > 0 && (
          <p className="mt-1 text-sm text-faded">{formatCents(job.price_cents)}</p>
        )}
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
      const batch = await confirm({
        title: 'Combine done jobs?',
        body: `${client.name} has ${siblings.length} other done job${siblings.length > 1 ? 's' : ''} (+${formatCents(extraTotal)}). Put them all on one invoice?`,
        confirmLabel: 'Include all',
        cancelLabel: 'Just this one',
      })
      if (batch) jobsToInvoice = [job, ...siblings]
    }

    const id = await createInvoiceFromJobs({
      clientId: client.id,
      client: { name: client.name, phone: client.phone },
      jobs: jobsToInvoice.map((j) => toInvoiceJob(j, client.id)),
      extraItems: [],
      defaultDueDays: settings?.default_due_days ?? 15,
      taxBps: settings?.sales_tax_bps ?? 0,
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
