import { Link, createFileRoute } from '@tanstack/react-router'
import { useJobsForDate, useJobsForRange } from '@/features/jobs/hooks'
import { StatusChip } from '@/features/jobs/JobActions'
import { formatCents, localToday } from '@/lib/format'
import { addDaysISO, formatShortDate, parseLocalDate } from '@/lib/dates'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export const Route = createFileRoute('/_authed/schedule')({
  validateSearch: (search: Record<string, unknown>): { date?: string } => ({
    date:
      typeof search.date === 'string' && DATE_RE.test(search.date)
        ? search.date
        : undefined,
  }),
  component: ScheduleScreen,
})

function ScheduleScreen() {
  const search = Route.useSearch()
  const today = localToday()
  const selected = search.date ?? today
  const days = Array.from({ length: 7 }, (_, i) => addDaysISO(today, i))

  const { data: weekJobs } = useJobsForRange(today, days[6])
  const { data: dayJobs, isLoading } = useJobsForDate(selected)

  const countByDate = new Map<string, number>()
  for (const job of weekJobs ?? []) {
    countByDate.set(job.scheduled_date, (countByDate.get(job.scheduled_date) ?? 0) + 1)
  }

  return (
    <div className="px-4 pt-6">
      <h1 className="heading-stencil text-2xl text-khaki">Schedule</h1>

      <div className="mt-4 flex gap-1 overflow-x-auto pb-1">
        {days.map((d) => {
          const isSelected = d === selected
          return (
            <Link
              key={d}
              to="/schedule"
              search={{ date: d }}
              className={`flex min-w-12 flex-1 flex-col items-center gap-1 rounded-lg border px-1 py-3 ${
                isSelected
                  ? 'border-blaze bg-panel text-blaze'
                  : 'border-edge bg-panel text-sand'
              }`}
            >
              <span className="heading-stencil text-[10px] text-faded">
                {parseLocalDate(d).toLocaleDateString('en-US', { weekday: 'narrow' })}
              </span>
              <span className="heading-stencil text-lg">
                {parseLocalDate(d).getDate()}
              </span>
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  (countByDate.get(d) ?? 0) > 0 ? 'bg-blaze' : 'bg-transparent'
                }`}
              />
            </Link>
          )
        })}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <h2 className="heading-stencil text-lg text-sand">{formatShortDate(selected)}</h2>
        <Link
          to="/jobs/new"
          search={{ date: selected }}
          className="heading-stencil shrink-0 rounded-lg bg-blaze px-4 py-3 text-sm text-canvas"
        >
          + Add job
        </Link>
      </div>

      <ul className="mt-3 flex flex-col gap-2">
        {(dayJobs ?? []).map((job) => (
          <li key={job.id}>
            <Link
              to="/jobs/$jobId"
              params={{ jobId: job.id }}
              className="flex items-center justify-between gap-2 rounded-lg border border-edge bg-panel px-4 py-4"
            >
              <span className="min-w-0">
                <span className="block truncate text-lg text-sand">
                  {job.property?.client?.name ?? 'Job'}
                </span>
                <span className="block truncate text-sm text-faded">
                  {job.property?.label}
                  {job.title && ` — ${job.title}`}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <StatusChip status={job.status} />
                <span className="heading-stencil text-sand">
                  {formatCents(job.price_cents)}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {!isLoading && (dayJobs ?? []).length === 0 && (
        <p className="mt-12 text-center text-faded">Nothing scheduled this day.</p>
      )}
    </div>
  )
}
