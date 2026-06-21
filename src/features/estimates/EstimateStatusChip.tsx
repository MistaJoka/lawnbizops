import { StatusChip, type StatusVariant } from '@/components/StatusChip'

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

function daysUntil(dateStr: string): number {
  const todayMidnight = new Date()
  todayMidnight.setHours(0, 0, 0, 0)
  const target = new Date(dateStr + 'T00:00:00')
  return Math.round((target.getTime() - todayMidnight.getTime()) / 86_400_000)
}

export function EstimateStatusChip({
  status,
  validUntil,
}: {
  status: string
  validUntil?: string | null
}) {
  const days = validUntil != null ? daysUntil(validUntil) : null
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
