import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RouteMap, type RouteStop } from './RouteMap'

// react-leaflet renders a real canvas that jsdom can't measure; stub each
// primitive to a div that exposes its identity + key props for assertions.
vi.mock('react-leaflet', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  MapContainer: ({ children }: any) => <div data-testid="map">{children}</div>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  TileLayer: ({ attribution }: any) => (
    <div data-testid="tiles" data-attribution={attribution} />
  ),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Marker: ({ children, position }: any) => (
    <div data-testid="marker" data-pos={String(position)}>
      {children}
    </div>
  ),
  CircleMarker: () => <div data-testid="origin" />,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Polyline: ({ positions }: any) => (
    <div data-testid="polyline" data-count={positions.length} />
  ),
  useMap: () => ({ fitBounds: vi.fn() }),
}))

const STOPS: RouteStop[] = [
  { id: 'a', lat: 28.5, lng: -81.5, label: 'Smith', seq: 1 },
  { id: 'b', lat: 28.6, lng: -81.4, label: 'Jones', seq: 2 },
]

describe('RouteMap', () => {
  it('renders one marker per stop', () => {
    render(
      <RouteMap
        stops={STOPS}
        origin={null}
        geometry={null}
        selectedId={null}
        onSelect={() => {}}
      />,
    )
    expect(screen.getAllByTestId('marker')).toHaveLength(2)
  })

  it('shows the OpenStreetMap attribution (free-tile license)', () => {
    render(
      <RouteMap
        stops={STOPS}
        origin={null}
        geometry={null}
        selectedId={null}
        onSelect={() => {}}
      />,
    )
    expect(screen.getByTestId('tiles').getAttribute('data-attribution')).toMatch(
      /OpenStreetMap/i,
    )
  })

  it('renders the GPS origin marker only when origin is provided', () => {
    const { rerender } = render(
      <RouteMap
        stops={STOPS}
        origin={null}
        geometry={null}
        selectedId={null}
        onSelect={() => {}}
      />,
    )
    expect(screen.queryByTestId('origin')).toBeNull()
    rerender(
      <RouteMap
        stops={STOPS}
        origin={{ lat: 28.4, lng: -81.6 }}
        geometry={null}
        selectedId={null}
        onSelect={() => {}}
      />,
    )
    expect(screen.getByTestId('origin')).toBeTruthy()
  })

  it('draws the road geometry when provided instead of straight segments', () => {
    render(
      <RouteMap
        stops={STOPS}
        origin={null}
        geometry={[
          { lat: 28.5, lng: -81.5 },
          { lat: 28.55, lng: -81.45 },
          { lat: 28.6, lng: -81.4 },
        ]}
        selectedId={null}
        onSelect={() => {}}
      />,
    )
    expect(screen.getByTestId('polyline').getAttribute('data-count')).toBe('3')
  })
})
