import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { EstimateStatusChip } from './EstimateStatusChip'

// Compute YYYY-MM-DD offset from today — avoids hardcoding dates in tests.
function relativeDate(offsetDays: number): string {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return d.toISOString().slice(0, 10)
}

describe('EstimateStatusChip — expiry urgency', () => {
  it('shows normal status label when estimate is accepted (no expiry warning)', () => {
    render(<EstimateStatusChip status="accepted" validUntil={relativeDate(1)} />)
    expect(screen.getByText('Accepted')).toBeTruthy()
  })

  it('shows normal "Sent" label when validUntil is more than 3 days away', () => {
    render(<EstimateStatusChip status="sent" validUntil={relativeDate(4)} />)
    expect(screen.getByText('Sent')).toBeTruthy()
  })

  it('shows urgency countdown when sent and validUntil is exactly 3 days away', () => {
    render(<EstimateStatusChip status="sent" validUntil={relativeDate(3)} />)
    expect(screen.getByText('Expires in 3d')).toBeTruthy()
  })

  it('shows "Expires today" when validUntil is today', () => {
    render(<EstimateStatusChip status="sent" validUntil={relativeDate(0)} />)
    expect(screen.getByText('Expires today')).toBeTruthy()
  })

  it('backward: shows "Expired" when validUntil is in the past and status is sent', () => {
    render(<EstimateStatusChip status="sent" validUntil={relativeDate(-1)} />)
    expect(screen.getByText('Expired')).toBeTruthy()
  })

  it('shows normal label when no validUntil is provided', () => {
    render(<EstimateStatusChip status="sent" />)
    expect(screen.getByText('Sent')).toBeTruthy()
  })
})
