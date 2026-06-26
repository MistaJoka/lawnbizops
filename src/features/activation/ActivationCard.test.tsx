import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ActivationCard } from './ActivationCard'

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    ...props
  }: {
    children: React.ReactNode
    [key: string]: unknown
  }) => <a {...(props as React.AnchorHTMLAttributes<HTMLAnchorElement>)}>{children}</a>,
}))

const mockClients = vi.fn()
const mockEstimates = vi.fn()
const mockJobs = vi.fn()
vi.mock('@/features/clients/hooks', () => ({ useClients: () => mockClients() }))
vi.mock('@/features/estimates/hooks', () => ({ useEstimates: () => mockEstimates() }))
vi.mock('@/features/jobs/hooks', () => ({ useKanbanJobs: () => mockJobs() }))

const prefs = { activationDismissed: false }
const savePreferences = vi.fn((patch: Record<string, unknown>) =>
  Object.assign(prefs, patch),
)
vi.mock('@/lib/preferences', () => ({
  loadPreferences: () => prefs,
  savePreferences: (p: Record<string, unknown>) => savePreferences(p),
}))

function setData(clients: unknown[], estimates: unknown[], jobs: unknown[]) {
  mockClients.mockReturnValue({ data: clients })
  mockEstimates.mockReturnValue({ data: estimates })
  mockJobs.mockReturnValue({ data: jobs })
}

afterEach(() => {
  prefs.activationDismissed = false
  savePreferences.mockClear()
  vi.clearAllMocks()
})

describe('ActivationCard', () => {
  it('shows all three steps with 0 of 3 done for a brand-new business', () => {
    setData([], [], [])
    render(<ActivationCard />)
    expect(screen.getByText(/0 of 3/)).toBeTruthy()
    expect(screen.getByText('Add your first client')).toBeTruthy()
    expect(screen.getByText('Create your first quote')).toBeTruthy()
    expect(screen.getByText('Schedule your first job')).toBeTruthy()
  })

  it('ticks off completed steps as counts arrive', () => {
    setData([{ id: 'c1' }], [], [])
    render(<ActivationCard />)
    expect(screen.getByText(/1 of 3/)).toBeTruthy()
    // a done step renders no "Start" affordance; two remain
    expect(screen.getAllByText('Start →')).toHaveLength(2)
  })

  it('renders nothing once all three steps are complete', () => {
    setData([{ id: 'c1' }], [{ id: 'e1' }], [{ id: 'j1' }])
    const { container } = render(<ActivationCard />)
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing while any count is still loading (no flash)', () => {
    mockClients.mockReturnValue({ data: undefined })
    mockEstimates.mockReturnValue({ data: [] })
    mockJobs.mockReturnValue({ data: [] })
    const { container } = render(<ActivationCard />)
    expect(container.firstChild).toBeNull()
  })

  it('hides and persists the preference when dismissed', () => {
    setData([], [], [])
    const { container } = render(<ActivationCard />)
    fireEvent.click(screen.getByLabelText('Hide setup checklist'))
    expect(savePreferences).toHaveBeenCalledWith({ activationDismissed: true })
    expect(container.firstChild).toBeNull()
  })

  it('stays hidden when the preference is already dismissed', () => {
    prefs.activationDismissed = true
    setData([], [], [])
    const { container } = render(<ActivationCard />)
    expect(container.firstChild).toBeNull()
  })
})
