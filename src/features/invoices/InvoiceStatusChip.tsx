const STATUS_COLOR: Record<string, string> = {
  draft: 'bg-surface-highest text-faded',
  sent: 'bg-olive text-sand',
  partially_paid: 'bg-blaze text-on-cta',
  paid: 'bg-go text-canvas',
  void: 'bg-surface-highest text-faded line-through',
}

const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft',
  sent: 'Sent',
  partially_paid: 'Partial',
  paid: 'Paid',
  void: 'Void',
}

export function InvoiceStatusChip({ status }: { status: string }) {
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
