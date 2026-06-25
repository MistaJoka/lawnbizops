import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DispatchScreen } from './dispatch'

// TanStack Router needs a router context; stub it so tests run without one.
vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => () => ({}),
  Link: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => (
    <a {...(props as React.AnchorHTMLAttributes<HTMLAnchorElement>)}>{children}</a>
  ),
}))

vi.mock('@/components/RouteMap', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  RouteMap: ({ stops }: any) => <div data-testid="routemap" data-stops={stops.length} />,
}))
vi.mock('@/lib/routing', () => ({ fetchRoadRoute: vi.fn().mockResolvedValue(null) }))

const mockJobs = vi.fn()
vi.mock('@/features/jobs/hooks', () => ({
  jobsForDateQueryOptions: () => ({ queryKey: ['jobs'], queryFn: async () => [] }),
  useJobsForDate: () => mockJobs(),
}))
vi.mock('@/lib/preferences', () => ({ loadPreferences: () => ({ gpsTracking: false }) }))

const pinnedJob = (id: string, label: string) => ({
  id,
  status: 'scheduled',
  property: { label, lat: 28.5, lng: -81.5, client: { name: label } },
})

describe('DispatchScreen', () => {
  it('renders the map with one stop per pinned active job', () => {
    mockJobs.mockReturnValue({
      data: [pinnedJob('a', 'Smith'), pinnedJob('b', 'Jones')],
      isLoading: false,
      isError: false,
    })
    render(<DispatchScreen />)
    expect(screen.getByTestId('routemap').getAttribute('data-stops')).toBe('2')
  })

  it('lists unpinned active jobs under a "not on map" heading', () => {
    mockJobs.mockReturnValue({
      data: [
        {
          id: 'c',
          status: 'scheduled',
          property: { label: 'NoGeo', lat: null, lng: null },
        },
      ],
      isLoading: false,
      isError: false,
    })
    render(<DispatchScreen />)
    expect(screen.getByText(/not on map/i)).toBeTruthy()
    expect(screen.getByText('NoGeo')).toBeTruthy()
  })

  it('shows an empty state when there are no active jobs today', () => {
    mockJobs.mockReturnValue({ data: [], isLoading: false, isError: false })
    render(<DispatchScreen />)
    expect(screen.getByText(/no jobs/i)).toBeTruthy()
  })
})
