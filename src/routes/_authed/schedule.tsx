import { Link, createFileRoute } from '@tanstack/react-router'
import { Fab } from '@/components/Fab'
import {
  jobsForDateQueryOptions,
  jobsForRangeQueryOptions,
  useJobsForDate,
  useJobsForRange,
} from '@/features/jobs/hooks'
import { StatusChip } from '@/features/jobs/JobActions'
import { QueryError } from '@/components/QueryError'
import { queryClient } from '@/lib/queryClient'
import { formatCents, localToday } from '@/lib/format'
import { addDaysISO, formatClockTime, formatShortDate, parseLocalDate } from '@/lib/dates'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export const Route = createFileRoute('/_authed/schedule')({
  validateSearch: (search: Record<string, unknown>): { date?: string } => ({
    date:
      typeof search.date === 'string' && DATE_RE.test(search.date)
        ? search.date
        : undefined,
  }),
  // Warm today's jobs + the visible week on intent. prefetchQuery never
  // throws — offline/no-cache stays graceful.
  loader: () => {
    const today = localToday()
    return Promise.all([
      queryClient.prefetchQuery(jobsForDateQueryOptions(today)),
      queryClient.prefetchQuery(jobsForRangeQueryOptions(today, addDaysISO(today, 6))),
    ])
  },
  component: ScheduleScreen,
})

function ScheduleScreen() {
  const search = Route.useSearch()
  const today = localToday()
  const selected = search.date ?? today
  const days = Array.from({ length: 7 }, (_, i) => addDaysISO(today, i))

  const { data: weekJobs } = useJobsForRange(today, days[6])
  const { data: dayJobs, isLoading, isError, refetch } = useJobsForDate(selected)

  const countByDate = new Map<string, number>()
  for (const job of weekJobs ?? []) {
    countByDate.set(job.scheduled_date, (countByDate.get(job.scheduled_date) ?? 0) + 1)
  }

  return (
    <div>
      <header className="sticky top-0 z-40 flex h-touch min-h-touch items-center border-b-2 border-edge bg-canvas px-edge">
        <h1 className="heading-stencil text-2xl text-khaki">Schedule</h1>
      </header>

      <section className="scroll-hide flex snap-x gap-3 overflow-x-auto bg-surface-low px-edge py-4">
        {days.map((d) => {
          const isSelected = d === selected
          const hasJobs = (countByDate.get(d) ?? 0) > 0
          const weekday = parseLocalDate(d).toLocaleDateString('en-US', {
            weekday: 'short',
          })
          const dayNum = parseLocalDate(d).getDate()

          return (
            <Link
              key={d}
              to="/schedule"
              search={{ date: d }}
              className={`tap-active flex shrink-0 snap-center flex-col items-center justify-center rounded-lg border-2 transition-transform ${
                isSelected
                  ? 'h-24 w-20 scale-105 border-khaki bg-blaze text-on-cta shadow-lg'
                  : 'h-20 w-16 border-edge bg-surface-high text-sand hover:bg-surface-highest'
              }`}
            >
              <span className="label-caps">{weekday}</span>
              <span
                className={`font-display font-bold ${
                  isSelected ? 'text-3xl' : 'text-2xl'
                }`}
              >
                {dayNum}
              </span>
              {hasJobs && (
                <span
                  className={`mt-1 h-1.5 w-1.5 rounded-full ${
                    isSelected ? 'bg-on-cta' : 'bg-blaze'
                  }`}
                />
              )}
            </Link>
          )
        })}
      </section>

      <section className="px-edge py-6">
        <h2 className="heading-stencil text-lg text-sand">{formatShortDate(selected)}</h2>

        <ul className="mt-4 flex flex-col gap-3">
          {(dayJobs ?? []).map((job) => (
            <li key={job.id}>
              <Link
                to="/jobs/$jobId"
                params={{ jobId: job.id }}
                className="card-surface tap-active flex items-center justify-between gap-2 p-4"
              >
                <span className="min-w-0">
                  <span className="block truncate font-display text-lg font-semibold text-sand">
                    {job.property?.client?.name ?? 'Job'}
                  </span>
                  <span className="block truncate text-sm text-muted">
                    {job.start_time && `${formatClockTime(job.start_time)} · `}
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

        {isError && (dayJobs?.length ?? 0) === 0 && (
          <QueryError onRetry={() => void refetch()} />
        )}

        {!isLoading && !isError && (dayJobs ?? []).length === 0 && (
          <p className="mt-12 text-center text-faded">Nothing scheduled this day.</p>
        )}
      </section>

      <Fab to="/jobs/new" search={{ date: selected }} label="Job" />
    </div>
  )
}
