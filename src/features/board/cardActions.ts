import { setEstimateStatus, type EstimateListRow } from '@/features/estimates/hooks'
import {
  recordReminder,
  recordPayment,
  type InvoiceBalance,
} from '@/features/invoices/hooks'
import { type JobWithContext } from '@/features/jobs/hooks'
import { googleMapsRouteUrl } from '@/lib/route'
import { formatCents, localToday } from '@/lib/format'

// Curated per-card-type quick actions: secondary sub-tasks and safe pipeline
// shortcuts that reuse existing flows (tel:/sms:/Maps, the friendly-reminder
// nudge, accept, record-payment). Kept separate from the component so it stays
// fast-refresh friendly and unit-testable.

export interface QuickAction {
  key: string
  label: string // accessible name
  glyph: string
  href?: string
  external?: boolean
  onClick?: () => void
  tone?: 'go' | 'blaze'
}

const call = (phone?: string): QuickAction | null =>
  phone ? { key: 'call', label: 'Call', glyph: '📞', href: `tel:${phone}` } : null

const text = (phone?: string, body?: string): QuickAction | null =>
  phone
    ? {
        key: 'text',
        label: 'Text',
        glyph: '💬',
        href: `sms:${phone}${body ? `?&body=${encodeURIComponent(body)}` : ''}`,
      }
    : null

const compact = (a: (QuickAction | null)[]): QuickAction[] =>
  a.filter((x): x is QuickAction => x !== null)

/** Job cards: call the client + navigate to the property. */
export function jobQuickActions(job: JobWithContext): QuickAction[] {
  const p = job.property
  const phone = p?.client?.phone
  const pos = p && p.lat !== null && p.lng !== null ? { lat: p.lat, lng: p.lng } : null
  const maps = pos ? googleMapsRouteUrl([pos]) : null
  return compact([
    call(phone),
    maps
      ? { key: 'maps', label: 'Open in Maps', glyph: '🧭', href: maps, external: true }
      : null,
  ])
}

/** Quote cards: follow up to win it, or accept it. */
export function quoteQuickActions(est: EstimateListRow): QuickAction[] {
  const phone = est.client?.phone
  return compact([
    call(phone),
    text(phone),
    {
      key: 'accept',
      label: 'Accept estimate',
      glyph: '✓',
      tone: 'go',
      onClick: () => void setEstimateStatus(est.id, 'accepted'),
    },
  ])
}

/** A/R cards: call, send a warm reminder, or mark it paid in full. */
export function arQuickActions(inv: InvoiceBalance): QuickAction[] {
  const phone = inv.client?.phone
  const name = inv.client?.name ?? 'there'
  const nudge =
    `Hi ${name}, friendly reminder about invoice ${inv.number ?? ''} — ` +
    `${formatCents(inv.balance_cents)} whenever it's convenient. Thank you!`
  return compact([
    call(phone),
    phone
      ? {
          key: 'nudge',
          label: 'Friendly reminder',
          glyph: '🔔',
          tone: 'blaze',
          onClick: () => {
            void recordReminder(inv.invoice_id)
            window.location.href = `sms:${phone}?&body=${encodeURIComponent(nudge)}`
          },
        }
      : null,
    {
      key: 'paid',
      label: 'Mark paid in full',
      glyph: '💵',
      tone: 'go',
      onClick: () =>
        void recordPayment({
          invoiceId: inv.invoice_id,
          amountCents: inv.balance_cents,
          method: 'other',
          paidAt: localToday(),
          note: 'Marked paid (board quick action)',
        }),
    },
  ])
}

/** Paid cards: light touch — just call. */
export function callOnly(phone?: string): QuickAction[] {
  return compact([call(phone)])
}
