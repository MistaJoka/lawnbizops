import { describe, expect, it } from 'vitest'
import { agingBucket, isOpen } from './hooks'

// A/R surface logic: which invoices still want money, and how overdue they
// are. These drive the overdue nudges and the aging chips on Money — a wrong
// bucket hides a delinquent invoice from the operator.

describe('isOpen', () => {
  const inv = (status: string, balance: number) =>
    ({ status, balance_cents: balance }) as Parameters<typeof isOpen>[0]

  it.each(['draft', 'sent', 'partially_paid'] as const)(
    'an unpaid %s invoice is open',
    (status) => {
      expect(isOpen(inv(status, 5000))).toBe(true)
    },
  )

  it.each(['paid', 'void'] as const)('a %s invoice is never open', (status) => {
    expect(isOpen(inv(status, 5000))).toBe(false)
  })

  it('a zero or negative balance closes it regardless of status', () => {
    expect(isOpen(inv('sent', 0))).toBe(false)
    expect(isOpen(inv('sent', -100))).toBe(false)
  })
})

describe('agingBucket', () => {
  const at = (due: string | null, today: string) => agingBucket({ due_at: due }, today)

  it('no due date is always current (nothing to be overdue against)', () => {
    expect(at(null, '2026-07-23')).toBe('current')
  })

  it('due today or in the future is current', () => {
    expect(at('2026-07-23', '2026-07-23')).toBe('current')
    expect(at('2026-08-01', '2026-07-23')).toBe('current')
  })

  it('buckets flip exactly at the 30/60/90-day boundaries', () => {
    const today = '2026-07-23'
    expect(at('2026-07-22', today)).toBe('1-30') // 1 day overdue
    expect(at('2026-06-23', today)).toBe('1-30') // 30 days
    expect(at('2026-06-22', today)).toBe('31-60') // 31 days
    expect(at('2026-05-24', today)).toBe('31-60') // 60 days
    expect(at('2026-05-23', today)).toBe('61-90') // 61 days
    expect(at('2026-04-24', today)).toBe('61-90') // 90 days
    expect(at('2026-04-23', today)).toBe('90+') // 91 days
  })
})
