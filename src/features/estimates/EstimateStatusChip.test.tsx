import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { EstimateStatusChip } from './EstimateStatusChip'

// Fixed reference "today" so expiry math never depends on the wall clock.
const TODAY = '2026-06-15'

// Compute a YYYY-MM-DD offset from TODAY using local-date arithmetic (no UTC,
// no real clock) — keeps tests deterministic regardless of when/where they run.
function relativeDate(offsetDays: number): string {
  const [y, m, d] = TODAY.split('-').map(Number)
  const date = new Date(y, m - 1, d + offsetDays)
  const yy = date.getFullYear()
  const mm = (date.getMonth() + 1).toString().padStart(2, '0')
  const dd = date.getDate().toString().padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

describe('EstimateStatusChip — expiry urgency', () => {
  it('shows normal status label when estimate is accepted (no expiry warning)', () => {
    render(
      <EstimateStatusChip status="accepted" validUntil={relativeDate(1)} today={TODAY} />,
    )
    expect(screen.getByText('Accepted')).toBeTruthy()
  })

  it('shows normal "Sent" label when validUntil is more than 3 days away', () => {
    render(
      <EstimateStatusChip status="sent" validUntil={relativeDate(4)} today={TODAY} />,
    )
    expect(screen.getByText('Sent')).toBeTruthy()
  })

  it('shows urgency countdown when sent and validUntil is exactly 3 days away', () => {
    render(
      <EstimateStatusChip status="sent" validUntil={relativeDate(3)} today={TODAY} />,
    )
    expect(screen.getByText('Expires in 3d')).toBeTruthy()
  })

  it('shows "Expires today" when validUntil is today', () => {
    render(
      <EstimateStatusChip status="sent" validUntil={relativeDate(0)} today={TODAY} />,
    )
    expect(screen.getByText('Expires today')).toBeTruthy()
  })

  it('backward: shows "Expired" when validUntil is in the past and status is sent', () => {
    render(
      <EstimateStatusChip status="sent" validUntil={relativeDate(-1)} today={TODAY} />,
    )
    expect(screen.getByText('Expired')).toBeTruthy()
  })

  it('shows normal label when no validUntil is provided', () => {
    render(<EstimateStatusChip status="sent" today={TODAY} />)
    expect(screen.getByText('Sent')).toBeTruthy()
  })
})
