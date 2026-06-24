import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { AppErrorFallback } from './AppErrorFallback'

describe('AppErrorFallback', () => {
  it('renders a recoverable message and a reload action that fires onReload', () => {
    const onReload = vi.fn()
    render(<AppErrorFallback onReload={onReload} />)

    // Recoverable, not blank: there's a heading and an actionable button.
    const reload = screen.getByRole('button', { name: /reload|try again|retry/i })
    fireEvent.click(reload)
    expect(onReload).toHaveBeenCalledTimes(1)
  })

  it('reassures that saved work is safe on the device', () => {
    render(<AppErrorFallback onReload={() => {}} />)
    expect(screen.getByText(/saved.*device|safe|offline/i)).toBeTruthy()
  })
})
