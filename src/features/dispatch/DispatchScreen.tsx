import { useEffect, useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { setJobStatus, useJobsForDate, type JobWithContext } from '@/features/jobs/hooks'
import { StatusChip } from '@/features/jobs/JobActions'
import { RouteMap, type RouteStop } from '@/components/RouteMap'
import { EmptyState } from '@/components/EmptyState'
import { QueryError } from '@/components/QueryError'
import { SkeletonList } from '@/components/Skeleton'
import { localToday } from '@/lib/format'
import { loadPreferences } from '@/lib/preferences'
import {
  googleMapsRouteUrl,
  haversineMiles,
  orderByNearestNeighbor,
  type LatLng,
} from '@/lib/route'
import { fetchRoadRoute, type RouteResult } from '@/lib/routing'

function jobPos(job: JobWithContext): LatLng | null {
  const p = job.property
  return p && p.lat !== null && p.lng !== null ? { lat: p.lat, lng: p.lng } : null
}

function jobLabel(job: JobWithContext): string {
  // Lead with the client name — "Home / Home / Home" across stops is useless on
  // a route. Append the property label when present so multi-property clients
  // stay distinguishable.
  const name = job.property?.client?.name
  const label = job.property?.label
  if (name) return label ? `${name} · ${label}` : name
  return label ?? 'Job'
}

export function DispatchScreen() {
  const today = localToday()
  const { data: jobs, isLoading, isError, refetch } = useJobsForDate(today)
  const [origin, setOrigin] = useState<LatLng | null>(null)
  // Keyed so stale results from a previous stopKey are ignored without calling
  // setState synchronously inside the effect (which triggers a cascade render).
  const [roadState, setRoadState] = useState<{
    key: string
    result: RouteResult | null
  } | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    if (!loadPreferences().gpsTracking) return
    if (!('geolocation' in navigator)) return
    navigator.geolocation.getCurrentPosition(
      (pos) => setOrigin({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setOrigin(null),
      { timeout: 5000, enableHighAccuracy: false },
    )
  }, [])

  const active = useMemo(
    () =>
      (jobs ?? []).filter((j) => j.status === 'scheduled' || j.status === 'in_progress'),
    [jobs],
  )

  const ordered = useMemo(
    () => orderByNearestNeighbor(origin, active, jobPos),
    [origin, active],
  )

  const pinned = useMemo(() => ordered.filter((j) => jobPos(j) !== null), [ordered])
  const unpinned = useMemo(() => ordered.filter((j) => jobPos(j) === null), [ordered])

  const stops: RouteStop[] = useMemo(
    () =>
      pinned.map((j, i) => {
        const p = jobPos(j)!
        return { id: j.id, lat: p.lat, lng: p.lng, label: jobLabel(j), seq: i + 1 }
      }),
    [pinned],
  )

  // Best-effort road upgrade. Re-run when the pinned set/order changes.
  const stopKey = stops.map((s) => `${s.lat},${s.lng}`).join('|')
  useEffect(() => {
    let cancelled = false
    if (stops.length < 2) return
    void fetchRoadRoute(stops.map((s) => ({ lat: s.lat, lng: s.lng }))).then((r) => {
      if (!cancelled) setRoadState({ key: stopKey, result: r ?? null })
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopKey])

  // Use road data only when it matches the current stop set; treat stale/absent as null.
  const road = roadState?.key === stopKey ? roadState.result : null

  const legMiles = (i: number): number | null => {
    if (road) return road.legs[i - 1]?.miles ?? null
    const prev = stops[i - 1]
    const cur = stops[i]
    return prev && cur ? haversineMiles(prev, cur) : null
  }

  const mapsUrl = googleMapsRouteUrl(stops.map((s) => ({ lat: s.lat, lng: s.lng })))

  if (isLoading) return <SkeletonList />
  if (isError) return <QueryError onRetry={() => void refetch()} />

  return (
    <div className="pb-24">
      <header className="mx-edge mt-4 flex items-center justify-between">
        <h1 className="heading-stencil text-lg text-sand">Dispatch</h1>
        <Link to="/" className="tap-active text-sm text-faded">
          Today
        </Link>
      </header>

      {active.length === 0 ? (
        <EmptyState title="No jobs to map" body="Nothing scheduled for today yet." />
      ) : (
        stops.length > 0 && (
          <>
            <div className="mx-edge mt-4 h-72 overflow-hidden rounded-lg border-2 border-edge">
              <RouteMap
                stops={stops}
                origin={origin}
                geometry={road?.geometry ?? null}
                selectedId={selectedId}
                onSelect={setSelectedId}
              />
            </div>

            {mapsUrl && (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="heading-stencil tap-active mx-edge mt-4 flex items-center justify-center rounded-lg border-2 border-edge bg-panel py-3 text-sm text-sand"
              >
                Open route in Maps ({stops.length} stop{stops.length === 1 ? '' : 's'})
              </a>
            )}

            <ol className="mx-edge mt-4 space-y-2">
              {stops.map((s, i) => {
                const miles = legMiles(i)
                const job = pinned[i]
                const selected = s.id === selectedId
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(selected ? null : s.id)}
                      aria-expanded={selected}
                      className={`tap-active flex w-full items-center justify-between rounded-lg border-2 px-4 py-3 text-left ${
                        selected ? 'border-blaze bg-panel' : 'border-edge bg-panel'
                      }`}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="truncate text-sm text-sand">
                          {s.seq}. {s.label}
                        </span>
                        {selected && <StatusChip status={job.status} />}
                      </span>
                      {miles !== null && (
                        <span className="shrink-0 font-mono text-xs text-faded">
                          {miles.toFixed(1)} mi
                        </span>
                      )}
                    </button>
                    {selected && <StopActions job={job} />}
                  </li>
                )
              })}
            </ol>
          </>
        )
      )}

      {unpinned.length > 0 && (
        <section className="mx-edge mt-6">
          <h2 className="heading-stencil text-xs text-khaki uppercase">Not on map</h2>
          <p className="mt-1 text-xs text-faded">
            No map pin — tap to add the property’s address.
          </p>
          <ul className="mt-2 space-y-2">
            {unpinned.map((j) => (
              <li key={j.id}>
                <Link
                  to="/jobs/$jobId"
                  params={{ jobId: j.id }}
                  className="tap-active flex items-center justify-between rounded-lg border-2 border-edge bg-panel px-4 py-3 text-sm text-sand"
                >
                  <span>{jobLabel(j)}</span>
                  <span aria-hidden className="text-faded">
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

/**
 * The selected stop's field actions — dispatch is the screen a crew lives on,
 * so the next status move, turn-by-turn to THIS stop, and the gate code must
 * not require opening the job. Marking done drops the stop off the route
 * (the active filter), which is exactly what finishing a stop should do.
 */
function StopActions({ job }: { job: JobWithContext }) {
  const p = job.property
  const scheduled = job.status === 'scheduled'
  const pos = jobPos(job)
  const navUrl = pos
    ? `https://www.google.com/maps/dir/?api=1&destination=${pos.lat}%2C${pos.lng}&travelmode=driving`
    : null

  return (
    <div className="mt-2 rounded-lg border-2 border-edge bg-surface-low p-2">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() =>
            void setJobStatus(job, scheduled ? 'in_progress' : 'done')
          }
          className="heading-stencil tap-active min-h-11 flex-1 rounded-lg bg-blaze px-2 py-2 text-sm text-on-cta"
        >
          {scheduled ? '▶ Start' : '✓ Done'}
        </button>
        {navUrl && (
          <a
            href={navUrl}
            target="_blank"
            rel="noreferrer"
            className="heading-stencil tap-active flex min-h-11 flex-1 items-center justify-center rounded-lg border-2 border-edge px-2 py-2 text-sm text-sand"
          >
            Navigate
          </a>
        )}
        <Link
          to="/jobs/$jobId"
          params={{ jobId: job.id }}
          className="heading-stencil tap-active flex min-h-11 flex-1 items-center justify-center rounded-lg border-2 border-edge px-2 py-2 text-sm text-sand"
        >
          Details
        </Link>
      </div>
      {p?.gate_code && (
        <p className="mt-2 px-1 text-sm text-faded">
          Gate code: <span className="heading-stencil text-blaze">{p.gate_code}</span>
        </p>
      )}
      {job.start_time && (
        <p className="mt-1 px-1 text-xs text-faded">Window: {job.start_time}</p>
      )}
    </div>
  )
}
