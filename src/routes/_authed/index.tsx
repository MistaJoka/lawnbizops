import { useEffect, useMemo, useState } from 'react'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  jobsForDateQueryOptions,
  useJobsForDate,
  type JobWithContext,
} from '@/features/jobs/hooks'
import { JobActions, StatusChip } from '@/features/jobs/JobActions'
import { CardQuickActions } from '@/features/board/CardQuickActions'
import { jobQuickActions } from '@/features/board/cardActions'
import { PipelineBoard } from '@/features/board/PipelineBoard'
import { QuickAddSheet } from '@/features/board/QuickAddJob'
import { Fab } from '@/components/Fab'
import { SkeletonList } from '@/components/Skeleton'
import { QueryError } from '@/components/QueryError'
import { supabase } from '@/lib/supabase'
import { queryClient } from '@/lib/queryClient'
import { formatCents, localToday } from '@/lib/format'
import { formatClockTime, materializeHorizon } from '@/lib/dates'
import {
  googleMapsRouteUrl,
  haversineMiles,
  orderByNearestNeighbor,
  type LatLng,
} from '@/lib/route'
import { loadPreferences, savePreferences } from '@/lib/preferences'
import { stockLevel, useInventory } from '@/features/inventory/hooks'
import { TasksSection } from '@/features/tasks/TaskUI'

export const Route = createFileRoute('/_authed/')({
  // Warm today's jobs on intent so the home screen paints instantly.
  // prefetchQuery never throws — offline/no-cache stays graceful.
  loader: () => queryClient.prefetchQuery(jobsForDateQueryOptions(localToday())),
  component: TodayScreen,
})

/** Materialize recurring jobs once per session — fire-and-forget. */
let materializedThisSession = false

function jobPos(job: JobWithContext): LatLng | null {
  const p = job.property
  return p && p.lat !== null && p.lng !== null ? { lat: p.lat, lng: p.lng } : null
}

function useOnline(): boolean {
  const [online, setOnline] = useState(navigator.onLine)
  useEffect(() => {
    const up = () => setOnline(true)
    const down = () => setOnline(false)
    window.addEventListener('online', up)
    window.addEventListener('offline', down)
    return () => {
      window.removeEventListener('online', up)
      window.removeEventListener('offline', down)
    }
  }, [])
  return online
}

/** Today is a work hub: a pipeline Board or the drive-order Route, toggled. */
function TodayScreen() {
  const online = useOnline()
  const [view, setView] = useState<'board' | 'route'>(loadPreferences().todayView)
  const [quickAdd, setQuickAdd] = useState(false)

  useEffect(() => {
    if (materializedThisSession || !navigator.onLine) return
    materializedThisSession = true
    void supabase
      .rpc('materialize_jobs', { through_date: materializeHorizon() })
      .then(() => queryClient.invalidateQueries({ queryKey: ['jobs'] }))
  }, [])

  function choose(next: 'board' | 'route') {
    setView(next)
    savePreferences({ todayView: next })
  }

  return (
    <div>
      <header className="sticky top-0 z-40 flex h-touch min-h-touch items-center justify-between border-b-2 border-edge bg-canvas px-edge">
        <div className="flex items-center gap-3">
          <h1 className="heading-stencil text-2xl text-khaki">Today</h1>
          {!online && (
            <span
              title="Offline"
              aria-label="Offline"
              className="inline-block h-2.5 w-2.5 rounded-full bg-alert"
            />
          )}
        </div>
        <div className="flex shrink-0 rounded-lg border-2 border-edge bg-panel p-0.5">
          {(['board', 'route'] as const).map((v) => (
            <button
              key={v}
              onClick={() => choose(v)}
              className={`heading-stencil tap-active rounded-lg px-3 py-1.5 text-sm ${
                view === v ? 'bg-blaze text-on-cta' : 'text-faded'
              }`}
            >
              {v === 'board' ? 'Board' : 'Route'}
            </button>
          ))}
        </div>
      </header>

      {view === 'board' ? (
        <PipelineBoard />
      ) : (
        <RouteView onQuickAdd={() => setQuickAdd(true)} />
      )}

      <QuickAddSheet open={quickAdd} onClose={() => setQuickAdd(false)} />
    </div>
  )
}

/** Drive-order route: nearest-neighbor stops + one-tap multi-stop Maps link. */
function RouteView({ onQuickAdd }: { onQuickAdd: () => void }) {
  const today = localToday()
  const { data: jobs, isLoading, isError, refetch } = useJobsForDate(today)
  const [origin, setOrigin] = useState<LatLng | null>(null)
  const alertsOn = loadPreferences().inventoryAlerts
  const { data: inventory } = useInventory(alertsOn)
  const lowStockCount = alertsOn
    ? (inventory ?? []).filter((i) => stockLevel(i) !== 'in_stock').length
    : 0

  useEffect(() => {
    // "GPS tracking" preference off → skip geolocation; drive order falls
    // back to starting from the first pinned job.
    if (!loadPreferences().gpsTracking) return
    if (!('geolocation' in navigator)) return
    navigator.geolocation.getCurrentPosition(
      (pos) => setOrigin({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setOrigin(null),
      { timeout: 5000, enableHighAccuracy: false },
    )
  }, [])

  const finished = (jobs ?? []).filter(
    (j) => j.status !== 'scheduled' && j.status !== 'in_progress',
  )

  const ordered = useMemo(() => {
    const active = (jobs ?? []).filter(
      (j) => j.status === 'scheduled' || j.status === 'in_progress',
    )
    return orderByNearestNeighbor(origin, active, jobPos)
  }, [origin, jobs])

  const legMiles = useMemo(() => {
    const out: (number | null)[] = []
    let prev = origin
    for (const job of ordered) {
      const pos = jobPos(job)
      out.push(pos && prev ? haversineMiles(prev, pos) : null)
      if (pos) prev = pos
    }
    return out
  }, [ordered, origin])

  const pinnedStops = ordered.map(jobPos).filter((p): p is LatLng => p !== null)
  const mapsUrl = googleMapsRouteUrl(pinnedStops)

  return (
    <div>
      <Fab onClick={onQuickAdd} />

      {mapsUrl && pinnedStops.length >= 1 && (
        <a
          href={mapsUrl}
          target="_blank"
          rel="noreferrer"
          className="heading-stencil tap-active mx-edge mt-4 flex items-center justify-center rounded-lg border-2 border-edge bg-panel py-3 text-sm text-sand"
        >
          Open route in Maps ({pinnedStops.length} stop
          {pinnedStops.length === 1 ? '' : 's'})
        </a>
      )}

      {lowStockCount > 0 && (
        <Link
          to="/inventory"
          className="tap-active mx-edge mt-4 flex items-center justify-between rounded-lg border-2 border-khaki bg-panel px-4 py-3"
        >
          <span className="text-sm text-sand">
            {lowStockCount} inventory item{lowStockCount === 1 ? '' : 's'} running low
          </span>
          <span className="label-caps text-blaze">Restock →</span>
        </Link>
      )}

      <TasksSection />

      <section className="space-y-0 px-edge py-6">
        {ordered.map((job, i) => (
          <div key={job.id}>
            {i > 0 && legMiles[i] !== null && (
              <TravelDivider miles={legMiles[i]!} active={job.status === 'in_progress'} />
            )}
            <TodayJobCard job={job} stop={i + 1} miles={legMiles[i]} isFirst={i === 0} />
          </div>
        ))}
      </section>

      {isError && (jobs?.length ?? 0) === 0 && (
        <QueryError onRetry={() => void refetch()} />
      )}

      {isLoading && ordered.length === 0 && (
        <div className="px-edge pt-2">
          <SkeletonList count={4} variant="card" />
        </div>
      )}

      {!isLoading && !isError && ordered.length === 0 && (
        <div className="flex flex-col items-center gap-3 px-edge py-16 text-center">
          <p className="text-lg text-faded">
            {finished.length > 0 ? 'All done for today.' : 'No jobs on the books yet.'}
          </p>
          {finished.length === 0 && (
            <p className="text-sm text-muted">
              Jobs you schedule will show up here, in drive order.
            </p>
          )}
          <button
            onClick={onQuickAdd}
            className="heading-stencil tap-active mt-2 rounded-lg bg-blaze px-6 py-4 text-lg text-on-cta"
          >
            + Add job
          </button>
        </div>
      )}

      {finished.length > 0 && (
        <section className="px-edge pb-6">
          <h2 className="label-caps text-faded">Done today</h2>
          <ul className="mt-3 flex flex-col gap-3">
            {finished.map((job) => (
              <li key={job.id} className="relative pl-8 opacity-60">
                <TimelineDot done />
                <Link
                  to="/jobs/$jobId"
                  params={{ jobId: job.id }}
                  className="card-surface tap-active block p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="min-w-0 truncate font-display text-lg font-semibold text-sand">
                      {job.property?.client?.name ?? 'Job'}
                    </span>
                    <StatusChip status={job.status} />
                  </div>
                  <p className="mt-1 truncate text-muted">
                    {job.property?.label}
                    {job.title && ` — ${job.title}`}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

function TravelDivider({ miles, active }: { miles: number; active: boolean }) {
  return (
    <div className="flex items-center gap-4 py-3 opacity-80">
      <div className="flex w-6 justify-center">
        <CarIcon className={active ? 'text-blaze' : 'text-faded'} />
      </div>
      <div className="relative flex-1 border-t-2 border-dashed border-edge">
        <span
          className={`label-caps absolute -top-3 left-1/2 -translate-x-1/2 bg-canvas px-2 ${
            active ? 'text-blaze' : 'text-faded'
          }`}
        >
          {miles.toFixed(1)} mi travel
        </span>
      </div>
    </div>
  )
}

function TimelineDot({ active, done }: { active?: boolean; done?: boolean }) {
  if (done) {
    return (
      <div className="absolute top-2 left-0 z-10 flex h-6 w-6 items-center justify-center rounded-full border-2 border-outline bg-surface-highest">
        <span className="text-[14px] text-muted">✓</span>
      </div>
    )
  }
  if (active) {
    return (
      <div className="absolute top-2 left-0 z-10 flex h-6 w-6 animate-pulse items-center justify-center rounded-full border-2 border-khaki bg-blaze">
        <div className="h-2 w-2 rounded-full bg-on-cta" />
      </div>
    )
  }
  return (
    <div className="absolute top-2 left-0 z-10 flex h-6 w-6 items-center justify-center rounded-full border-2 border-edge bg-surface-low">
      <div className="h-2 w-2 rounded-full bg-faded" />
    </div>
  )
}

function TodayJobCard({
  job,
  stop,
  miles,
  isFirst,
}: {
  job: JobWithContext
  stop: number
  miles: number | null
  isFirst: boolean
}) {
  const navigate = useNavigate()
  const p = job.property
  const active = job.status === 'in_progress'

  function openDetail() {
    void navigate({ to: '/jobs/$jobId', params: { jobId: job.id } })
  }

  return (
    <div className="relative pl-8">
      <div
        className={`absolute top-2 bottom-0 left-[11px] w-0.5 ${
          active ? 'bg-blaze' : 'bg-edge opacity-30'
        }`}
      />
      <TimelineDot active={active} />
      <div
        role="button"
        tabIndex={0}
        onClick={openDetail}
        onKeyDown={(e) => {
          if (e.key === 'Enter') openDetail()
        }}
        className={`tap-active cursor-pointer rounded-lg border-2 p-4 ${
          active
            ? 'border-khaki bg-panel shadow-lg shadow-blaze/10'
            : 'border-edge bg-panel'
        }`}
      >
        <div className="mb-2 flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-col gap-1">
            {active && (
              <span className="label-caps text-blaze">Stop {stop} · active</span>
            )}
            {!active && isFirst && (
              <span className="label-caps text-muted">Stop {stop}</span>
            )}
            {!active && !isFirst && (
              <span className="label-caps text-muted">Stop {stop}</span>
            )}
          </div>
          <StatusChip status={job.status} />
        </div>

        <h3
          className={`font-display text-xl font-semibold ${
            active ? 'text-khaki' : 'text-sand'
          }`}
        >
          {p?.client?.name ?? 'Job'}
        </h3>

        <p className="mt-1 flex items-center gap-1 truncate text-muted">
          <LocationIcon />
          {[p?.label, p?.city].filter(Boolean).join(' · ')}
          {job.title && <span> — {job.title}</span>}
        </p>

        <div className="mt-2 flex items-center gap-3">
          <span className="heading-stencil text-lg text-sand">
            {formatCents(job.price_cents)}
          </span>
          {job.start_time && (
            <span className="label-caps text-khaki">
              {formatClockTime(job.start_time)}
            </span>
          )}
          {p?.gate_code && (
            <span className="label-caps rounded border-2 border-blaze px-2 py-1 text-blaze">
              Gate {p.gate_code}
            </span>
          )}
          {miles !== null && !isFirst && (
            <span className="inline-block py-2 pr-4 text-sm text-faded">
              {miles.toFixed(1)} mi
            </span>
          )}
        </div>

        <JobActions job={job} />
        <CardQuickActions actions={jobQuickActions(job)} />
      </div>
    </div>
  )
}

function LocationIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="shrink-0"
    >
      <path d="M12 21s7-4.5 7-11a7 7 0 1 0-14 0c0 6.5 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  )
}

function CarIcon({ className }: { className?: string }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={className}
    >
      <path d="M5 17h14M5 17a2 2 0 0 1-2-2v-4l2-5h14l2 5v4a2 2 0 0 1-2 2M5 17H3M19 17h2" />
      <circle cx="7.5" cy="17" r="1.5" />
      <circle cx="16.5" cy="17" r="1.5" />
    </svg>
  )
}
