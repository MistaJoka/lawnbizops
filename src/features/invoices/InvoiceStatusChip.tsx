import { StatusChip, type StatusVariant } from '@/components/StatusChip'

const VARIANT: Record<string, StatusVariant> = {
  draft: 'neutral',
  sent: 'info',
  partially_paid: 'progress',
  paid: 'success',
  void: 'muted',
}

const LABEL: Record<string, string> = {
  draft: 'Draft',
  sent: 'Sent',
  partially_paid: 'Partial',
  paid: 'Paid',
  void: 'Void',
}

export function InvoiceStatusChip({ status }: { status: string }) {
  return (
    <StatusChip variant={VARIANT[status] ?? 'neutral'}>
      {LABEL[status] ?? status}
    </StatusChip>
  )
}
