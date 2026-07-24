import { useState } from 'react'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { Bell, CloudRain } from 'lucide-react'
import { HeaderAdd } from '@/components/HeaderAdd'
import {
  jobsForDateQueryOptions,
  jobsForRangeQueryOptions,
  rescheduleJob,
  useJobsForDate,
  useJobsForRange,
  type JobWithContext,
} from '@/features/jobs/hooks'
import { StatusChip } from '@/features/jobs/JobActions'
import { useMissedJobs } from '@/features/jobs/attention'
import { useBusinessSettings } from '@/features/invoices/hooks'
import { appointmentReminderMessage, smsHref } from '@/lib/outreach'
import { logActivity } from '@/features/activities/hooks'
import { EmptyState } from '@/components/EmptyState'
import { SkeletonList } from '@/components/Skeleton'
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
  // Pageable 7-day window: offset 0 anchors on today; ±1 pages a full week.
  // Past weeks are reviewable, and work booked beyond 6 days out is reachable.
  const [weekOffset, setWeekOffset] = useState(0)
  const weekStart = addDaysISO(today, weekOffset * 7)
  const days = Array.from({ length: 7 }, (_, i) => addDaysISO(weekStart, i))

  const { data: weekJobs } = useJobsForRange(weekStart, days[6])
  const { data: dayJobs, isLoading, isError, refetch } = useJobsForDate(selected)
  const { data: settings } = useBusinessSettings()
  const business = settings?.business_name ?? ''

  const countByDate = new Map<string, number>()
  for (const job of weekJobs ?? []) {
    countByDate.set(job.scheduled_date, (countByDate.get(job.scheduled_date) ?? 0) + 1)
  }

  return (
    <div>
      <header className="sticky top-0 z-40 flex h-touch min-h-touch items-center justify-between border-b-2 border-edge bg-canvas px-edge">
        <h1 className="heading-stencil text-2xl text-sand">Schedule</h1>
        <HeaderAdd to="/jobs/new" search={{ date: selected }} label="Job" />
      </header>

      <div className="flex items-center justify-between bg-surface-low px-edge pt-3">
        <button
          type="button"
          onClick={() => setWeekOffset((o) => o - 1)}
          aria-label="Previous week"
          className="heading-stencil tap-active flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-edge px-4 text-sm text-sand"
        >
          ‹
        </button>
        {weekOffset === 0 ? (
          <span className="label-caps text-faded">This week</span>
        ) : (
          <button
            type="button"
            onClick={() => setWeekOffset(0)}
            className="label-caps tap-active text-blaze"
          >
            {formatShortDate(weekStart)} – {formatShortDate(days[6])} · back to today
          </button>
        )}
        <button
          type="button"
          onClick={() => setWeekOffset((o) => o + 1)}
          aria-label="Next week"
          className="heading-stencil tap-active flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-edge px-4 text-sm text-sand"
        >
          ›
        </button>
      </div>

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
              <span className="label-caps">{d === today ? 'Today' : weekday}</span>
              <span
                className={`font-display font-bold tabular-nums ${
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

      <MissedJobsSection today={today} />

      <section className="px-edge py-6">
        <h2 className="heading-stencil text-lg text-sand">{formatShortDate(selected)}</h2>

        <BulkMoveDay jobs={dayJobs ?? []} selected={selected} />

        <ul className="mt-4 flex flex-col gap-3">
          {(dayJobs ?? []).map((job) => {
            const phone = job.property?.client?.phone
            // One-tap heads-up for upcoming visits: prefilled sms: composer,
            // shown only on future scheduled jobs with a phone on file.
            const canRemind = selected > today && job.status === 'scheduled' && phone
            return (
              <li key={job.id} className="flex items-stretch gap-2">
                <Link
                  to="/jobs/$jobId"
                  params={{ jobId: job.id }}
                  className="card-surface tap-active flex min-w-0 flex-1 items-center justify-between gap-2 p-4"
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
                    {job.price_cents > 0 && (
                      <span className="heading-stencil text-sand tabular-nums">
                        {formatCents(job.price_cents)}
                      </span>
                    )}
                  </span>
                </Link>
                {canRemind && (
                  <a
                    href={smsHref(
                      phone,
                      appointmentReminderMessage(
                        business,
                        job.property?.client?.name ?? 'there',
                        selected === addDaysISO(today, 1)
                          ? 'tomorrow'
                          : `on ${formatShortDate(selected)}`,
                      ),
                    )}
                    onClick={() => {
                      const clientId = job.property?.client?.id
                      if (clientId)
                        void logActivity({
                          clientId,
                          jobId: job.id,
                          kind: 'note',
                          body: `Texted an appointment reminder for ${formatShortDate(selected)}.`,
                        })
                    }}
                    aria-label="Text appointment reminder"
                    className="tap-active flex w-12 shrink-0 items-center justify-center rounded-lg border-2 border-edge"
                  >
                    <Bell size={20} aria-hidden />
                  </a>
                )}
              </li>
            )
          })}
        </ul>

        {isError && (dayJobs?.length ?? 0) === 0 && (
          <QueryError onRetry={() => void refetch()} />
        )}

        {isLoading && (dayJobs ?? []).length === 0 && (
          <div className="mt-4">
            <SkeletonList count={3} variant="card" />
          </div>
        )}

        {!isLoading && !isError && (dayJobs ?? []).length === 0 && (
          <EmptyState
            title="Nothing scheduled this day"
            body="Use + Job to put work on the books."
          />
        )}
      </section>
    </div>
  )
}

/** Jobs still `scheduled` after their day passed. Without this they vanish
 *  from Today and the week strip and are never seen again — the operator
 *  either reschedules (job detail → Move) or closes them out. Hidden when
 *  everything is on track. */
function MissedJobsSection({ today }: { today: string }) {
  const { data: missed } = useMissedJobs(today)
  if ((missed ?? []).length === 0) return null

  return (
    <section className="border-b-2 border-edge px-edge py-4">
      <h2 className="heading-stencil text-sm text-alert">
        Missed — needs a new day ({missed?.length})
      </h2>
      <ul className="mt-3 flex flex-col gap-2">
        {(missed ?? []).map((job) => (
          <li key={job.id}>
            <Link
              to="/jobs/$jobId"
              params={{ jobId: job.id }}
              className="tap-active flex items-center justify-between gap-2 rounded-lg border-2 border-alert/50 bg-panel px-4 py-3"
            >
              <span className="min-w-0">
                <span className="block truncate font-display font-semibold text-sand">
                  {job.property?.client?.name ?? 'Job'}
                </span>
                <span className="block truncate text-sm text-faded">
                  {formatShortDate(job.scheduled_date)}
                  {job.property?.label && ` · ${job.property.label}`}
                  {job.title && ` — ${job.title}`}
                </span>
              </span>
              {job.price_cents > 0 && (
                <span className="heading-stencil shrink-0 text-sand tabular-nums">
                  {formatCents(job.price_cents)}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

/**
 * Rain-day escape hatch: move every still-scheduled job on this day to a new
 * date in one action (in-progress/done jobs stay put). Collapsed behind one
 * tap so the common single-job day isn't cluttered.
 */
function BulkMoveDay({ jobs, selected }: { jobs: JobWithContext[]; selected: string }) {
  const navigate = useNavigate()
  const movable = jobs.filter((j) => j.status === 'scheduled')
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState(addDaysISO(selected, 1))
  const [busy, setBusy] = useState(false)

  if (movable.length < 2) return null

  async function moveAll() {
    if (busy || !date || date === selected) return
    setBusy(true)
    try {
      for (const job of movable) {
        await rescheduleJob(job, date)
      }
      setOpen(false)
      void navigate({ to: '/schedule', search: { date } })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-3">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="heading-stencil tap-active inline-flex w-full items-center justify-center gap-2 rounded-lg border border-edge bg-panel py-2 text-xs text-faded"
        >
          <CloudRain size={16} aria-hidden /> Move all {movable.length} to another day
        </button>
      ) : (
        <div className="flex items-center gap-2 rounded-lg border border-edge bg-panel p-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            disabled={busy}
            aria-label="Move all jobs to this date"
            className="w-full rounded-lg border-2 border-edge bg-canvas px-4 py-3 text-lg text-sand focus:border-blaze focus:outline-none disabled:opacity-50"
          />
          <button
            type="button"
            onClick={() => void moveAll()}
            disabled={busy || !date || date === selected}
            className="heading-stencil tap-active shrink-0 rounded-lg bg-blaze px-4 py-3 text-on-cta disabled:opacity-50"
          >
            {busy ? '…' : `Move ${movable.length}`}
          </button>
        </div>
      )}
    </div>
  )
}
