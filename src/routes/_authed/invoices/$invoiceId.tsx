import { useState } from 'react'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  PAYMENT_METHODS,
  emailInvoice,
  getLastPaymentMethod,
  rememberPaymentMethod,
  invoiceTotalCents,
  taxCents,
  lineTotalCents,
  markSent,
  recordPayment,
  recordReminder,
  reversePayment,
  useBusinessSettings,
  useInvoice,
  voidInvoice,
  type InvoiceDetail,
  type Payment,
  type PaymentMethod,
} from '@/features/invoices/hooks'
import { InvoiceStatusChip } from '@/features/invoices/InvoiceStatusChip'
import { invoiceFilename, shareInvoicePdf } from '@/features/invoices/share'
import { Field, PrimaryButton, Select, TextInput, DangerButton } from '@/components/Field'
import { EmptyState } from '@/components/EmptyState'
import { QueryError } from '@/components/QueryError'
import { SkeletonDetail } from '@/components/Skeleton'
import { confirm } from '@/lib/confirm'
import { toast } from '@/lib/toast'
import { formatCents, localToday, parseDollarsToCents } from '@/lib/format'
import { formatShortDate } from '@/lib/dates'

export const Route = createFileRoute('/_authed/invoices/$invoiceId')({
  component: InvoiceDetailScreen,
})

function formatNudgeDate(timestamp: string): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

function InvoiceDetailScreen() {
  const { invoiceId } = Route.useParams()
  const navigate = useNavigate()
  const { data: detail, isLoading, isError, refetch } = useInvoice(invoiceId)
  const { data: settings } = useBusinessSettings()
  const [paying, setPaying] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [emailing, setEmailing] = useState(false)

  if (!detail) {
    return (
      <div className="px-edge pt-6">
        <Link to="/money" className="inline-block py-2 pr-4 text-sm text-faded">
          ← Money
        </Link>
        {isLoading ? (
          <div className="mt-4">
            <SkeletonDetail />
          </div>
        ) : isError ? (
          <QueryError onRetry={() => void refetch()} />
        ) : (
          <p className="mt-16 text-center text-faded">Invoice not found.</p>
        )}
      </div>
    )
  }

  const { invoice, items, payments, client } = detail
  const subtotal = invoiceTotalCents(items)
  const taxBps = invoice.tax_bps ?? 0
  const tax = taxCents(subtotal, taxBps)
  const total = subtotal + tax
  const paid = payments.reduce((sum, p) => sum + p.amount_cents, 0)
  const balance = total - paid
  const canRemind =
    balance > 0 && (invoice.status === 'sent' || invoice.status === 'partially_paid')
  const canPay = balance > 0 && invoice.status !== 'void'

  // A payment is spent once an offsetting "Reversal of <id>" line exists — used
  // to hide the Reverse action so a single payment can't be reversed twice.
  const reversedIds = new Set(
    payments
      .filter((p) => p.amount_cents < 0 && p.note.startsWith('Reversal of '))
      .map((p) => p.note.slice('Reversal of '.length)),
  )

  async function handleReverse(payment: Payment) {
    if (
      !(await confirm({
        title: `Reverse this ${formatCents(payment.amount_cents)} payment?`,
        body: 'An offsetting line is recorded — nothing is deleted.',
        confirmLabel: 'Reverse payment',
        destructive: true,
      }))
    )
      return
    await reversePayment(payment)
  }

  async function handleSharePdf() {
    if (!detail || !detail.invoice.number || sharing) return
    setSharing(true)
    try {
      const [{ pdf }, { InvoicePdf }, { fetchLogoDataUrl }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('@/features/invoices/InvoicePdf'),
        import('@/features/settings/hooks'),
      ])
      // Resolves to undefined on failure/offline — PDF renders without a logo.
      const logoDataUrl = await fetchLogoDataUrl(settings?.logo_path)
      const blob = await pdf(
        <InvoicePdf
          detail={detail}
          settings={settings ?? null}
          logoDataUrl={logoDataUrl}
        />,
      ).toBlob()
      const shared = await shareInvoicePdf(
        blob,
        invoiceFilename(detail.invoice.number, detail.client?.name ?? 'Client'),
      )
      if (shared && detail.invoice.status === 'draft') {
        await markSent(detail.invoice.id)
      }
    } finally {
      setSharing(false)
    }
  }

  async function handleReminder() {
    if (!detail) return
    const firstName = (detail.client?.name ?? 'there').split(' ')[0]
    const businessName = settings?.business_name || 'LawnBizOps'
    const text = `Hi ${firstName}, hope you're doing well! Just a friendly note that invoice ${detail.invoice.number ?? ''} for ${formatCents(balance)} is still open whenever you get a chance. No rush at all — and thank you as always for the business! — ${businessName}`
    if (navigator.share) {
      try {
        await navigator.share({ text })
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') return
        throw e
      }
    } else {
      await navigator.clipboard.writeText(text)
      toast.info('Message copied')
    }
    await recordReminder(detail.invoice.id)
  }

  async function handleEmail() {
    if (!detail || !detail.client?.email || emailing) return
    setEmailing(true)
    try {
      await emailInvoice(detail)
    } finally {
      setEmailing(false)
    }
  }

  async function handleVoid() {
    if (!detail) return
    const body =
      paid > 0
        ? `This invoice has ${formatCents(paid)} in recorded payments. Voiding reverses them so they stop counting as collected.`
        : 'It stays on the books as a record but stops counting toward what you’re owed.'
    if (
      !(await confirm({
        title: 'Void this invoice?',
        body,
        confirmLabel: 'Void invoice',
        destructive: true,
      }))
    )
      return
    await voidInvoice(detail.invoice.id)
    void navigate({ to: '/money' })
  }

  return (
    <div className="px-edge pt-6">
      <Link to="/money" className="inline-block py-2 pr-4 text-sm text-faded">
        ← Money
      </Link>

      <div className="mt-2 flex items-start justify-between gap-3">
        <h1 className="heading-stencil min-w-0 text-2xl text-khaki">
          {invoice.number ?? 'pending #'}
        </h1>
        <InvoiceStatusChip status={invoice.status} />
      </div>
      <p className="mt-1 text-faded">
        Issued {formatShortDate(invoice.issued_at)}
        {invoice.due_at && ` · due ${formatShortDate(invoice.due_at)}`}
      </p>

      {client && (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-edge bg-panel px-4 py-4">
          <span className="min-w-0">
            <span className="heading-stencil block text-xs text-faded">Client</span>
            <Link
              to="/clients/$clientId"
              params={{ clientId: client.id }}
              className="mt-1 block truncate text-lg text-sand underline decoration-edge"
            >
              {client.name}
            </Link>
          </span>
          {client.phone && (
            <a
              href={`tel:${client.phone}`}
              className="heading-stencil shrink-0 rounded-lg bg-blaze px-4 py-3 text-on-cta"
            >
              📞 Call
            </a>
          )}
        </div>
      )}

      <div className="mt-4 rounded-lg border border-edge bg-panel px-4 py-2">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-start justify-between gap-3 border-b border-edge py-3 last:border-b-0"
          >
            <span className="min-w-0">
              <span className="block text-sand">{item.description}</span>
              {item.quantity !== 1 && (
                <span className="block text-sm text-faded tabular-nums">
                  {item.quantity} × {formatCents(item.unit_price_cents)}
                </span>
              )}
            </span>
            <span className="shrink-0 text-right text-sand tabular-nums">
              {formatCents(lineTotalCents(item))}
            </span>
          </div>
        ))}
        {items.length === 0 && (
          <EmptyState
            glyph="🧾"
            title="No line items"
            body="This invoice has no line items yet."
          />
        )}
      </div>

      <div className="mt-4 rounded-lg border border-edge bg-panel px-4 py-4">
        {taxBps > 0 && (
          <>
            <div className="flex items-center justify-between text-sm text-faded">
              <span>Subtotal</span>
              <span className="tabular-nums">{formatCents(subtotal)}</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-sm text-faded">
              <span>Sales tax ({(taxBps / 100).toFixed(2).replace(/\.?0+$/, '')}%)</span>
              <span className="tabular-nums">{formatCents(tax)}</span>
            </div>
          </>
        )}
        <div
          className={`flex items-center justify-between text-sm text-faded ${
            taxBps > 0 ? 'mt-1' : ''
          }`}
        >
          <span>Total</span>
          <span className="tabular-nums">{formatCents(total)}</span>
        </div>
        <div className="mt-1 flex items-center justify-between text-sm text-faded">
          <span>Paid</span>
          <span className={`tabular-nums ${paid > 0 ? 'text-go' : ''}`}>
            {formatCents(paid)}
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between border-t border-edge pt-2">
          <span className="heading-stencil text-xs text-faded">Balance</span>
          <span
            className={`heading-stencil text-3xl tabular-nums ${balance > 0 ? 'text-sand' : 'text-go'}`}
          >
            {formatCents(balance)}
          </span>
        </div>
      </div>

      {payments.length > 0 && (
        <div className="mt-4 rounded-lg border border-edge bg-panel px-4 py-2">
          <p className="heading-stencil pt-2 text-xs text-faded">Payments</p>
          {payments.map((payment) => {
            const isReversal = payment.amount_cents < 0
            const canReverse =
              !isReversal && !reversedIds.has(payment.id) && invoice.status !== 'void'
            return (
              <div
                key={payment.id}
                className="flex items-center justify-between gap-3 border-b border-edge py-3 last:border-b-0"
              >
                <span className="min-w-0">
                  <span
                    className={`block capitalize ${isReversal ? 'text-faded line-through' : 'text-sand'}`}
                  >
                    {payment.method.replace('_', ' ')}
                  </span>
                  <span className="block text-sm text-faded">
                    {formatShortDate(payment.paid_at)}
                    {payment.note && ` · ${payment.note}`}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-3">
                  <span
                    className={`tabular-nums ${isReversal ? 'text-faded' : 'text-go'}`}
                  >
                    {formatCents(payment.amount_cents)}
                  </span>
                  {canReverse && (
                    <button
                      type="button"
                      onClick={() => void handleReverse(payment)}
                      className="tap-active min-h-12 rounded-lg border-2 border-edge px-3 text-xs text-alert"
                    >
                      Reverse
                    </button>
                  )}
                </span>
              </div>
            )
          })}
        </div>
      )}

      <div className="mt-6 flex flex-col gap-3 pb-8">
        {canPay &&
          (paying ? (
            <PaymentSheet
              detail={detail}
              balance={balance}
              onDone={() => setPaying(false)}
            />
          ) : (
            <PrimaryButton onClick={() => setPaying(true)}>Record payment</PrimaryButton>
          ))}

        {invoice.status !== 'void' && (
          <div>
            <button
              type="button"
              disabled={!client?.email || emailing}
              onClick={() => void handleEmail()}
              className="heading-stencil w-full rounded-lg border border-edge bg-panel px-4 py-4 text-lg text-sand disabled:opacity-50"
            >
              {emailing ? 'Queueing…' : 'Email invoice'}
            </button>
            <p className="mt-1 text-center text-xs text-faded">
              {invoice.sent_at
                ? `Emailed ${formatNudgeDate(invoice.sent_at)}`
                : client?.email
                  ? `Sends to ${client.email}.`
                  : 'Add an email to the client to send directly.'}
            </p>
          </div>
        )}

        {invoice.status !== 'void' && (
          <div>
            <button
              type="button"
              disabled={!invoice.number || sharing}
              onClick={() => void handleSharePdf()}
              className="heading-stencil w-full rounded-lg border border-edge bg-panel px-4 py-4 text-lg text-sand disabled:opacity-50"
            >
              {sharing ? 'Building PDF…' : 'Share PDF'}
            </button>
            {!invoice.number && (
              <p className="mt-1 text-center text-xs text-faded">
                Syncs first — number pending
              </p>
            )}
          </div>
        )}

        {canRemind && (
          <div>
            <button
              type="button"
              onClick={() => void handleReminder()}
              className="heading-stencil w-full rounded-lg border border-edge bg-panel px-4 py-4 text-lg text-khaki"
            >
              Friendly reminder
            </button>
            {invoice.last_reminded_at && (
              <p className="mt-1 text-center text-xs text-faded">
                Last nudged {formatNudgeDate(invoice.last_reminded_at)}
              </p>
            )}
          </div>
        )}

        {invoice.status !== 'void' && (
          <div className="mt-6">
            <DangerButton type="button" onClick={() => void handleVoid()}>
              Void invoice
            </DangerButton>
          </div>
        )}
      </div>
    </div>
  )
}

function PaymentSheet({
  detail,
  balance,
  onDone,
}: {
  detail: InvoiceDetail
  balance: number
  onDone: () => void
}) {
  const [dollars, setDollars] = useState((balance / 100).toFixed(2))
  const [method, setMethod] = useState<PaymentMethod>(getLastPaymentMethod())
  const [date, setDate] = useState(localToday())
  const [note, setNote] = useState('')
  const [amountError, setAmountError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (saving) return
    const cents = parseDollarsToCents(dollars)
    if (cents === null || cents <= 0) {
      setAmountError('Enter a dollar amount.')
      return
    }
    if (cents > balance) {
      setAmountError(
        `That's more than the ${formatCents(balance)} balance due — check the amount.`,
      )
      return
    }
    setSaving(true)
    try {
      await recordPayment({
        invoiceId: detail.invoice.id,
        amountCents: cents,
        method,
        paidAt: date,
        note,
      })
      rememberPaymentMethod(method)
      onDone()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-lg border border-blaze bg-panel px-4 py-4">
      <p className="heading-stencil text-xs text-faded">Record payment</p>
      <div className="mt-3 flex flex-col gap-3">
        <Field label="Amount ($)">
          <TextInput
            inputMode="decimal"
            value={dollars}
            onChange={(e) => {
              setDollars(e.target.value)
              setAmountError(null)
            }}
          />
        </Field>
        {amountError && <p className="-mt-2 text-sm text-alert">{amountError}</p>}
        <Field label="Method">
          <Select
            value={method}
            onChange={(e) => setMethod(e.target.value as PaymentMethod)}
          >
            {PAYMENT_METHODS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Date">
          <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Note">
          <TextInput
            placeholder="Check #1042, etc."
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </Field>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onDone}
            disabled={saving}
            className="heading-stencil tap-active flex-1 rounded-lg border border-edge px-4 py-4 text-sand disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="heading-stencil tap-active flex-1 rounded-lg bg-blaze px-4 py-4 text-lg text-on-cta disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
