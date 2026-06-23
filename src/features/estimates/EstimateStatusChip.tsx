import { StatusChip, type StatusVariant } from '@/components/StatusChip'
import { localToday } from '@/lib/format'

const VARIANT: Record<string, StatusVariant> = {
  draft: 'neutral',
  sent: 'info',
  accepted: 'success',
  declined: 'danger',
  expired: 'muted',
}

const LABEL: Record<string, string> = {
  draft: 'Draft',
  sent: 'Sent',
  accepted: 'Accepted',
  declined: 'Declined',
  expired: 'Expired',
}

function daysUntil(dateStr: string, today: string): number {
  const todayMidnight = new Date(today + 'T00:00:00')
  const target = new Date(dateStr + 'T00:00:00')
  return Math.round((target.getTime() - todayMidnight.getTime()) / 86_400_000)
}

export function EstimateStatusChip({
  status,
  validUntil,
  today = localToday(),
}: {
  status: string
  validUntil?: string | null
  /** Reference "today" (YYYY-MM-DD) for expiry math. Defaults to device-local today; injected in tests for determinism. */
  today?: string
}) {
  const days = validUntil != null ? daysUntil(validUntil, today) : null
  const expiringSoon = status === 'sent' && days != null && days <= 3

  if (expiringSoon) {
    const label =
      days === 0 ? 'Expires today' : days! < 0 ? 'Expired' : `Expires in ${days}d`
    return <StatusChip variant="attention">{label}</StatusChip>
  }

  return (
    <StatusChip variant={VARIANT[status] ?? 'neutral'}>
      {LABEL[status] ?? status}
    </StatusChip>
  )
}
