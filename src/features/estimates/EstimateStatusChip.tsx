const STATUS_COLOR: Record<string, string> = {
  draft: 'text-faded border-edge',
  sent: 'text-khaki border-edge',
  accepted: 'text-go border-edge',
  declined: 'text-alert border-edge',
  expired: 'text-faded border-edge line-through',
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
      className={`heading-stencil shrink-0 rounded border px-2 py-1 text-[10px] ${
        STATUS_COLOR[status] ?? 'text-faded border-edge'
      }`}
    >
      {STATUS_LABEL[status] ?? status}
    </span>
  )
}
