import { Link, createFileRoute } from '@tanstack/react-router'
import { useEstimates } from '@/features/estimates/hooks'
import { setJobStatus, useKanbanJobs, type JobWithContext } from '@/features/jobs/hooks'
import { StatusChip } from '@/features/jobs/JobActions'
import { formatCents } from '@/lib/format'
import { formatClockTime, formatShortDate } from '@/lib/dates'

export const Route = createFileRoute('/_authed/board')({
  component: BoardScreen,
})

type Column = {
  id: string
  title: string
  tint: string
}

const COLUMNS: Column[] = [
  { id: 'quote', title: 'Quote', tint: 'border-outline' },
  { id: 'todo', title: 'To do', tint: 'border-edge' },
  { id: 'progress', title: 'In progress', tint: 'border-khaki' },
  { id: 'done', title: 'Done', tint: 'border-go' },
]

function BoardScreen() {
  const { data: jobs } = useKanbanJobs()
  const { data: estimates } = useEstimates()

  const quoteCards = (estimates ?? []).filter(
    (e) => e.status === 'draft' || e.status === 'sent',
  )
  const todoJobs = (jobs ?? []).filter((j) => j.status === 'scheduled')
  const progressJobs = (jobs ?? []).filter((j) => j.status === 'in_progress')
  const doneJobs = (jobs ?? []).filter(
    (j) => j.status === 'done' || j.status === 'invoiced',
  )

  return (
    <div>
      <header className="sticky top-0 z-40 flex h-touch min-h-touch items-center justify-between border-b-2 border-edge bg-canvas px-edge">
        <h1 className="heading-stencil text-2xl text-khaki">Jobs board</h1>
        <Link to="/" className="label-caps text-blaze">
          Route view
        </Link>
      </header>

      <div className="scroll-hide flex snap-x gap-3 overflow-x-auto px-edge py-4">
        <KanbanColumn
          column={COLUMNS[0]}
          count={quoteCards.length}
          empty="No open quotes"
        >
          {quoteCards.map((est) => (
            <Link
              key={est.id}
              to="/estimates/$estimateId"
              params={{ estimateId: est.id }}
              className="card-surface tap-active block p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="font-display text-base font-semibold text-sand">
                  {est.client?.name ?? 'Estimate'}
                </span>
                <span className="status-badge rounded bg-olive px-2 py-0.5 text-sand">
                  {est.status}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted">{formatCents(est.total_cents)}</p>
            </Link>
          ))}
        </KanbanColumn>

        <KanbanColumn
          column={COLUMNS[1]}
          count={todoJobs.length}
          empty="Nothing scheduled"
        >
          {todoJobs.map((job) => (
            <JobKanbanCard key={job.id} job={job} advance="in_progress" />
          ))}
        </KanbanColumn>

        <KanbanColumn
          column={COLUMNS[2]}
          count={progressJobs.length}
          empty="Nothing active"
        >
          {progressJobs.map((job) => (
            <JobKanbanCard key={job.id} job={job} advance="done" />
          ))}
        </KanbanColumn>

        <KanbanColumn
          column={COLUMNS[3]}
          count={doneJobs.length}
          empty="Nothing finished yet"
        >
          {doneJobs.map((job) => (
            <Link
              key={job.id}
              to="/jobs/$jobId"
              params={{ jobId: job.id }}
              className="card-surface tap-active block p-3 opacity-80"
            >
              <KanbanCardBody job={job} />
            </Link>
          ))}
        </KanbanColumn>
      </div>

      <div className="px-edge pb-6">
        <Link
          to="/jobs/new"
          search={{}}
          className="heading-stencil tap-active block rounded-lg bg-blaze py-4 text-center text-lg text-on-cta"
        >
          + Add job
        </Link>
      </div>
    </div>
  )
}

function KanbanColumn({
  column,
  count,
  empty,
  children,
}: {
  column: Column
  count: number
  empty: string
  children: React.ReactNode
}) {
  return (
    <section
      className={`flex w-[82vw] max-w-sm shrink-0 snap-center flex-col rounded-xl border-2 bg-surface-low p-3 ${column.tint}`}
    >
      <div className="mb-3 flex items-center justify-between">
        <h2 className="heading-stencil text-sm text-sand">{column.title}</h2>
        <span className="label-caps text-faded">{count}</span>
      </div>
      <div className="flex min-h-32 flex-col gap-2">{children}</div>
      {count === 0 && <p className="py-8 text-center text-sm text-faded">{empty}</p>}
    </section>
  )
}

function JobKanbanCard({
  job,
  advance,
}: {
  job: JobWithContext
  advance: 'in_progress' | 'done'
}) {
  return (
    <div className="card-surface p-3">
      <Link to="/jobs/$jobId" params={{ jobId: job.id }} className="block">
        <KanbanCardBody job={job} />
      </Link>
      <button
        type="button"
        onClick={() => void setJobStatus(job, advance)}
        className="heading-stencil tap-active mt-2 w-full rounded-lg border-2 border-edge py-2 text-xs text-sand"
      >
        {advance === 'in_progress' ? '▶ Start' : '✓ Done'}
      </button>
    </div>
  )
}

function KanbanCardBody({ job }: { job: JobWithContext }) {
  const p = job.property
  return (
    <>
      <div className="flex items-start justify-between gap-2">
        <span className="font-display text-base font-semibold text-sand">
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
    </>
  )
}
