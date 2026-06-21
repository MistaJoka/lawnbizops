const STATUS_COLOR: Record<string, string> = {
  draft: 'bg-surface-highest text-faded',
  sent: 'bg-olive text-sand',
  accepted: 'bg-go text-canvas',
  declined: 'bg-alert/20 text-alert',
  expired: 'bg-surface-highest text-faded line-through',
}

const STATUS_LABEL: Record<string, string> = {
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

  const color = expiringSoon
    ? 'bg-blaze/20 text-blaze'
    : (STATUS_COLOR[status] ?? 'bg-surface-highest text-faded')

  let label = STATUS_LABEL[status] ?? status
  if (expiringSoon) {
    label = days === 0 ? 'Expires today' : days < 0 ? 'Expired' : `Expires in ${days}d`
  }

  return (
    <span className={`status-badge shrink-0 rounded px-2 py-0.5 ${color}`}>{label}</span>
  )
}
