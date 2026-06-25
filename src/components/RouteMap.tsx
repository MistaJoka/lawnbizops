import { useEffect } from 'react'
import {
  MapContainer,
  TileLayer,
  Marker,
  CircleMarker,
  Polyline,
  useMap,
} from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { LatLng } from '@/lib/route'

export interface RouteStop {
  id: string
  lat: number
  lng: number
  label: string
  seq: number
}

interface RouteMapProps {
  stops: RouteStop[]
  origin: LatLng | null
  geometry: LatLng[] | null
  selectedId: string | null
  onSelect: (id: string) => void
}

const FALLBACK_CENTER: [number, number] = [27.9944, -81.7603] // central Florida

// Numbered, glove-friendly pin as a divIcon (no external image asset, so it
// survives bundling). Selected pin uses the blaze CTA color.
function numberedIcon(seq: number, selected: boolean): L.DivIcon {
  const bg = selected ? 'var(--color-blaze, #ff6b00)' : 'var(--color-panel, #1e2023)'
  return L.divIcon({
    className: '',
    html: `<div style="width:32px;height:32px;border-radius:9999px;border:2px solid #d8c9a8;background:${bg};color:#f2ead6;font:700 14px/28px ui-monospace,monospace;text-align:center">${seq}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  })
}

function FitBounds({ stops, origin }: { stops: RouteStop[]; origin: LatLng | null }) {
  const map = useMap()
  const boundsKey =
    stops.map((s) => `${s.lat},${s.lng}`).join('|') +
    (origin ? `@${origin.lat},${origin.lng}` : '')
  useEffect(() => {
    const pts: [number, number][] = stops.map((s) => [s.lat, s.lng])
    if (origin) pts.push([origin.lat, origin.lng])
    if (pts.length > 0) map.fitBounds(L.latLngBounds(pts), { padding: [40, 40] })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, boundsKey])
  return null
}

export function RouteMap({
  stops,
  origin,
  geometry,
  selectedId,
  onSelect,
}: RouteMapProps) {
  const linePts: [number, number][] = geometry
    ? geometry.map((p) => [p.lat, p.lng])
    : stops.map((s) => [s.lat, s.lng])

  return (
    <MapContainer
      center={FALLBACK_CENTER}
      zoom={11}
      scrollWheelZoom
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds stops={stops} origin={origin} />
      {linePts.length >= 2 && (
        <Polyline
          positions={linePts}
          pathOptions={{ color: '#e25822', weight: 4, opacity: 0.8 }}
        />
      )}
      {origin && (
        <CircleMarker
          center={[origin.lat, origin.lng]}
          radius={7}
          pathOptions={{ color: '#6db56d', fillColor: '#6db56d', fillOpacity: 1 }}
        />
      )}
      {stops.map((s) => (
        <Marker
          key={s.id}
          position={[s.lat, s.lng]}
          icon={numberedIcon(s.seq, s.id === selectedId)}
          eventHandlers={{ click: () => onSelect(s.id) }}
          title={s.label}
        />
      ))}
    </MapContainer>
  )
}
