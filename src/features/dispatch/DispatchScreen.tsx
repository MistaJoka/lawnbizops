import { useEffect, useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useJobsForDate, type JobWithContext } from '@/features/jobs/hooks'
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
  return job.property?.label ?? job.property?.client?.name ?? 'Job'
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
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(s.id)}
                      className={`tap-active flex w-full items-center justify-between rounded-lg border-2 px-4 py-3 text-left ${
                        s.id === selectedId
                          ? 'border-blaze bg-panel'
                          : 'border-edge bg-panel'
                      }`}
                    >
                      <span className="text-sm text-sand">
                        {s.seq}. {s.label}
                      </span>
                      {miles !== null && (
                        <span className="font-mono text-xs text-faded">
                          {miles.toFixed(1)} mi
                        </span>
                      )}
                    </button>
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
          <ul className="mt-2 space-y-2">
            {unpinned.map((j) => (
              <li
                key={j.id}
                className="rounded-lg border-2 border-edge bg-panel px-4 py-3 text-sm text-faded"
              >
                {jobLabel(j)}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
