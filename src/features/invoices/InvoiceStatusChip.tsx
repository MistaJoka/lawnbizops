const STATUS_COLOR: Record<string, string> = {
  draft: 'text-faded border-edge',
  sent: 'text-khaki border-edge',
  partially_paid: 'text-blaze border-blaze',
  paid: 'text-go border-edge',
  void: 'text-faded border-edge line-through',
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
      className={`heading-stencil shrink-0 rounded border px-2 py-1 text-[10px] ${
        STATUS_COLOR[status] ?? 'text-faded border-edge'
      }`}
    >
      {STATUS_LABEL[status] ?? status}
    </span>
  )
}
