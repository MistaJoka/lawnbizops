import { useEffect, useMemo, useState } from 'react'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useJobsForDate, type JobWithContext } from '@/features/jobs/hooks'
import { JobActions } from '@/features/jobs/JobActions'
import { supabase } from '@/lib/supabase'
import { queryClient } from '@/lib/queryClient'
import { formatCents, localToday } from '@/lib/format'
import { materializeHorizon } from '@/lib/dates'
import {
  googleMapsRouteUrl,
  haversineMiles,
  orderByNearestNeighbor,
  type LatLng,
} from '@/lib/route'

export const Route = createFileRoute('/_authed/')({
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

function TodayScreen() {
  const today = localToday()
  const online = useOnline()
  const { data: jobs, isLoading } = useJobsForDate(today)
  const [origin, setOrigin] = useState<LatLng | null>(null)

  useEffect(() => {
    if (materializedThisSession || !navigator.onLine) return
    materializedThisSession = true
    void supabase
      .rpc('materialize_jobs', { through_date: materializeHorizon() })
      .then(() => queryClient.invalidateQueries({ queryKey: ['jobs'] }))
  }, [])

  useEffect(() => {
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

  // Distance from the previous pinned point (device location for stop #1).
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
    <div className="px-4 pt-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="heading-stencil flex items-center gap-2 text-2xl text-khaki">
          Today
          {!online && (
            <span
              title="Offline"
              aria-label="Offline"
              className="inline-block h-2.5 w-2.5 rounded-full bg-alert"
            />
          )}
        </h1>
        {mapsUrl && pinnedStops.length >= 1 && (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noreferrer"
            className="heading-stencil shrink-0 rounded-lg border border-edge bg-panel px-4 py-3 text-sm text-sand"
          >
            Open route in Maps
          </a>
        )}
      </div>

      <ul className="mt-4 flex flex-col gap-3">
        {ordered.map((job, i) => (
          <TodayJobCard key={job.id} job={job} stop={i + 1} miles={legMiles[i]} />
        ))}
      </ul>

      {!isLoading && ordered.length === 0 && (
        <div className="mt-16 flex flex-col items-center gap-3 text-center">
          <p className="text-lg text-faded">
            {finished.length > 0 ? 'All done for today.' : 'No jobs on the books yet.'}
          </p>
          {finished.length === 0 && (
            <p className="text-sm text-faded">
              Jobs you schedule will show up here, in drive order.
            </p>
          )}
          <Link
            to="/jobs/new"
            search={{}}
            className="heading-stencil mt-2 rounded-lg bg-blaze px-6 py-4 text-lg text-canvas"
          >
            + Add job
          </Link>
        </div>
      )}

      {finished.length > 0 && (
        <>
          <h2 className="heading-stencil mt-8 text-sm text-faded">Done today</h2>
          <ul className="mt-2 flex flex-col gap-2 opacity-60">
            {finished.map((job) => (
              <li key={job.id}>
                <Link
                  to="/jobs/$jobId"
                  params={{ jobId: job.id }}
                  className="flex items-center justify-between gap-2 rounded-lg border border-edge bg-panel px-4 py-3"
                >
                  <span className="min-w-0 truncate text-sand">
                    {job.property?.client?.name ?? 'Job'}
                    <span className="text-faded"> · {job.property?.label}</span>
                  </span>
                  <span
                    className={`heading-stencil shrink-0 text-xs ${
                      job.status === 'skipped' ? 'text-faded' : 'text-go'
                    }`}
                  >
                    {job.status === 'skipped' ? 'Skipped' : '✓ Done'}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

function TodayJobCard({
  job,
  stop,
  miles,
}: {
  job: JobWithContext
  stop: number
  miles: number | null
}) {
  const navigate = useNavigate()
  const p = job.property

  function openDetail() {
    void navigate({ to: '/jobs/$jobId', params: { jobId: job.id } })
  }

  return (
    <li>
      <div
        role="button"
        tabIndex={0}
        onClick={openDetail}
        onKeyDown={(e) => {
          if (e.key === 'Enter') openDetail()
        }}
        className={`cursor-pointer rounded-lg border bg-panel px-4 py-4 ${
          job.status === 'in_progress' ? 'border-blaze' : 'border-edge'
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <span className="flex min-w-0 items-center gap-2">
            <span className="heading-stencil flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-khaki text-sm text-khaki">
              {stop}
            </span>
            <span className="min-w-0 truncate text-lg text-sand">
              {p?.client?.name ?? 'Job'}
            </span>
          </span>
          <span className="heading-stencil shrink-0 text-lg text-sand">
            {formatCents(job.price_cents)}
          </span>
        </div>

        <p className="mt-1 truncate text-sm text-faded">
          {[p?.label, p?.city].filter(Boolean).join(' · ')}
          {job.title && <span> — {job.title}</span>}
        </p>

        <div className="mt-2 flex items-center gap-3">
          {p?.gate_code && (
            <span className="heading-stencil rounded border border-blaze px-2 py-1 text-sm text-blaze">
              Gate {p.gate_code}
            </span>
          )}
          {miles !== null && (
            <span className="text-sm text-faded">{miles.toFixed(1)} mi</span>
          )}
        </div>

        <JobActions job={job} />
      </div>
    </li>
  )
}
