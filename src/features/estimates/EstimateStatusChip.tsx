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

export function EstimateStatusChip({ status }: { status: string }) {
  return (
    <span
      className={`status-badge shrink-0 rounded px-2 py-0.5 ${
        STATUS_COLOR[status] ?? 'bg-surface-highest text-faded'
      }`}
    >
      {STATUS_LABEL[status] ?? status}
    </span>
  )
}
