import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryClient } from '@/lib/queryClient'
import { enqueue } from '@/lib/outbox'
import { confirmToast } from '@/lib/toast'
import { localToday } from '@/lib/format'
import { addDaysISO, parseLocalDate } from '@/lib/dates'
import {
  markJobsInvoicedInCaches,
  restoreInvoicedJobInCaches,
} from '@/features/jobs/hooks'
import { maybeAdvanceStage } from '@/features/clients/hooks'
import type { Tables } from '@/lib/database.types'

export type Invoice = Tables<'invoices'>
export type InvoiceItem = Tables<'invoice_items'>
export type Payment = Tables<'payments'>
export type BusinessSettings = Tables<'business_settings'>

export type InvoiceStatus = 'draft' | 'sent' | 'partially_paid' | 'paid' | 'void'

export type PaymentMethod = 'cash' | 'check' | 'zelle' | 'card_external' | 'other'

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'check', label: 'Check' },
  { value: 'zelle', label: 'Zelle' },
  { value: 'card_external', label: 'Card (external)' },
  { value: 'other', label: 'Other' },
]

// Most operators get paid the same way every time. Remember the last method
// (device-local — it's a per-device habit, not org data) and default to it so
// the payment form doesn't re-ask for the obvious answer.
const LAST_METHOD_KEY = 'lbo:lastPaymentMethod'

export function getLastPaymentMethod(): PaymentMethod {
  try {
    const v = localStorage.getItem(LAST_METHOD_KEY)
    if (v && PAYMENT_METHODS.some((m) => m.value === v)) return v as PaymentMethod
  } catch {
    /* localStorage unavailable (private mode / SSR) — fall through */
  }
  return 'cash'
}

export function rememberPaymentMethod(method: PaymentMethod): void {
  try {
    localStorage.setItem(LAST_METHOD_KEY, method)
  } catch {
    /* ignore */
  }
}

/** A row from the invoice_balances view, joined with the client's name/phone. */
export interface InvoiceBalance {
  invoice_id: string
  client_id: string
  number: string | null
  status: InvoiceStatus
  issued_at: string
  due_at: string | null
  last_reminded_at: string | null
  total_cents: number
  paid_cents: number
  balance_cents: number
  client: { name: string; phone: string } | null
}

export interface InvoiceDetail {
  invoice: Invoice
  items: InvoiceItem[]
  payments: Payment[]
  client: { id: string; name: string; phone: string; email?: string } | null
}

/** quantity is numeric (can be fractional) — round to whole cents at the edge. */
export function lineTotalCents(item: {
  quantity: number
  unit_price_cents: number
}): number {
  return Math.round(item.quantity * item.unit_price_cents)
}

export function invoiceTotalCents(
  items: { quantity: number; unit_price_cents: number }[],
): number {
  return items.reduce((sum, item) => sum + lineTotalCents(item), 0)
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

/** Shared so a route loader can warm the list on tab-intent (preload). */
export const invoiceBalancesQueryOptions = {
  queryKey: ['invoices'] as const,
  queryFn: async (): Promise<InvoiceBalance[]> => {
    const { data, error } = await supabase
      .from('invoice_balances')
      .select('*, client:clients(name, phone)')
      .order('issued_at', { ascending: false })
    if (!error) return data as unknown as InvoiceBalance[]

    // Views only infer FK joins in some PostgREST setups — fall back to a
    // second query and stitch the client in ourselves.
    const { data: rows, error: viewError } = await supabase
      .from('invoice_balances')
      .select('*')
      .order('issued_at', { ascending: false })
    if (viewError) throw viewError
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('id, name, phone')
    if (clientsError) throw clientsError
    const byId = new Map(clients.map((c) => [c.id, { name: c.name, phone: c.phone }]))
    return (rows as unknown as Omit<InvoiceBalance, 'client'>[]).map((row) => ({
      ...row,
      client: byId.get(row.client_id) ?? null,
    }))
  },
}

export function useInvoiceBalances() {
  return useQuery(invoiceBalancesQueryOptions)
}

export function useInvoice(id: string) {
  return useQuery({
    queryKey: ['invoices', id],
    queryFn: async (): Promise<InvoiceDetail> => {
      const { data: invoice, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', id)
        .single()
      if (error) throw error
      const { data: items, error: itemsError } = await supabase
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', id)
        .order('sort_order')
      if (itemsError) throw itemsError
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .eq('invoice_id', id)
        .order('paid_at')
      if (paymentsError) throw paymentsError
      const { data: client } = await supabase
        .from('clients')
        .select('id, name, phone, email')
        .eq('id', invoice.client_id)
        .maybeSingle()
      return { invoice, items, payments, client: client ?? null }
    },
  })
}

export interface UninvoicedJob {
  id: string
  title: string
  scheduled_date: string
  completed_at: string | null
  price_cents: number
  property: { client_id: string; label: string; address_line1: string } | null
  service: { name: string } | null
}

/** Jobs marked done (not yet invoiced) for any property of this client. */
export function useUninvoicedDoneJobs(clientId: string) {
  return useQuery({
    queryKey: ['jobs', { uninvoicedFor: clientId }],
    enabled: clientId !== '',
    queryFn: async (): Promise<UninvoicedJob[]> => {
      const { data, error } = await supabase
        .from('jobs')
        .select(
          'id, title, scheduled_date, completed_at, price_cents, property:properties!inner(client_id, label, address_line1), service:services(name)',
        )
        .eq('status', 'done')
        .eq('property.client_id', clientId)
        .order('scheduled_date')
      if (error) throw error
      return data as unknown as UninvoicedJob[]
    },
  })
}

export function useBusinessSettings() {
  return useQuery({
    queryKey: ['business_settings'],
    queryFn: async (): Promise<BusinessSettings | null> => {
      const { data, error } = await supabase
        .from('business_settings')
        .select('*')
        .maybeSingle()
      if (error) throw error
      return data
    },
  })
}

// ---------------------------------------------------------------------------
// Writes (optimistic cache + outbox)
// ---------------------------------------------------------------------------

/** Apply a patch to an invoice in both the list and detail caches. */
function patchInvoiceCaches(
  id: string,
  patch: Partial<Invoice> & Partial<InvoiceBalance>,
): void {
  queryClient.setQueryData<InvoiceBalance[]>(['invoices'], (old) =>
    old?.map((row) => (row.invoice_id === id ? { ...row, ...patch } : row)),
  )
  queryClient.setQueryData<InvoiceDetail>(['invoices', id], (old) =>
    old ? { ...old, invoice: { ...old.invoice, ...patch } } : old,
  )
}

export interface ExtraLineItem {
  description: string
  quantity: number
  unit_price_cents: number
}

export interface CreateInvoiceInput {
  clientId: string
  client: { name: string; phone: string } | null
  jobs: UninvoicedJob[]
  extraItems: ExtraLineItem[]
  defaultDueDays: number
}

/**
 * Build a draft invoice from done jobs + free-form lines. FIFO order matters:
 * the invoice upsert must land before its items, and items before the job
 * status flips (so a halt-and-retry never leaves orphans).
 */
export async function createInvoiceFromJobs(input: CreateInvoiceInput): Promise<string> {
  const id = crypto.randomUUID()
  const issuedAt = localToday()
  const dueAt = addDaysISO(issuedAt, input.defaultDueDays)

  const invoiceRow = {
    id,
    client_id: input.clientId,
    status: 'draft' as const,
    issued_at: issuedAt,
    due_at: dueAt,
    notes: '',
  }

  let sortOrder = 0
  const itemRows = [
    ...input.jobs.map((job) => ({
      id: crypto.randomUUID(),
      invoice_id: id,
      job_id: job.id,
      description: `${job.title || job.service?.name || 'Job'} — ${job.scheduled_date}`,
      quantity: 1,
      unit_price_cents: job.price_cents,
      sort_order: sortOrder++,
    })),
    ...input.extraItems.map((item) => ({
      id: crypto.randomUUID(),
      invoice_id: id,
      job_id: null,
      description: item.description,
      quantity: item.quantity,
      unit_price_cents: item.unit_price_cents,
      sort_order: sortOrder++,
    })),
  ]

  const total = invoiceTotalCents(itemRows)
  const now = new Date().toISOString()

  // Optimistic caches so the detail screen renders fully offline.
  const cachedInvoice: Invoice = {
    ...invoiceRow,
    number: null,
    estimate_id: null,
    last_reminded_at: null,
    sent_at: null,
    created_at: now,
    updated_at: now,
    user_id: '',
    org_id: '',
  }
  const cachedItems: InvoiceItem[] = itemRows.map((item) => ({
    ...item,
    unit_price_cents: item.unit_price_cents,
    created_at: now,
    updated_at: now,
    user_id: '',
    org_id: '',
  }))
  queryClient.setQueryData<InvoiceDetail>(['invoices', id], {
    invoice: cachedInvoice,
    items: cachedItems,
    payments: [],
    client: input.client ? { id: input.clientId, ...input.client } : null,
  })
  const balanceRow: InvoiceBalance = {
    invoice_id: id,
    client_id: input.clientId,
    number: null,
    status: 'draft',
    issued_at: issuedAt,
    due_at: dueAt,
    last_reminded_at: null,
    total_cents: total,
    paid_cents: 0,
    balance_cents: total,
    client: input.client,
  }
  queryClient.setQueryData<InvoiceBalance[]>(['invoices'], (old) =>
    old ? [balanceRow, ...old] : [balanceRow],
  )
  const invoicedJobIds = new Set(input.jobs.map((j) => j.id))
  queryClient.setQueryData<UninvoicedJob[]>(
    ['jobs', { uninvoicedFor: input.clientId }],
    (old) => old?.filter((j) => !invoicedJobIds.has(j.id)),
  )
  // Flip the jobs to 'invoiced' in every cached view (board, day list, detail)
  // so they leave Done everywhere at once — no stale 'done' to re-invoice.
  markJobsInvoicedInCaches(input.jobs)

  // FIFO: invoice → items → job status flips.
  await enqueue({ table: 'invoices', kind: 'upsert', payload: invoiceRow })
  for (const item of itemRows) {
    await enqueue({ table: 'invoice_items', kind: 'upsert', payload: item })
  }
  for (const job of input.jobs) {
    await enqueue({
      table: 'jobs',
      kind: 'update',
      payload: { id: job.id, patch: { status: 'invoiced' } },
    })
  }
  confirmToast('Invoice created')
  return id
}

export interface RecordPaymentInput {
  invoiceId: string
  amountCents: number
  method: PaymentMethod
  paidAt: string
  note: string
}

/** Record a payment via the idempotent apply_payment RPC (p_id = client uuid). */
export async function recordPayment(input: RecordPaymentInput): Promise<void> {
  const paymentId = crypto.randomUUID()
  const now = new Date().toISOString()

  // Optimistic: bump paid/balance in the list + append to the detail cache.
  queryClient.setQueryData<InvoiceBalance[]>(['invoices'], (old) =>
    old?.map((row) => {
      if (row.invoice_id !== input.invoiceId) return row
      const paid = row.paid_cents + input.amountCents
      const balance = row.total_cents - paid
      return {
        ...row,
        paid_cents: paid,
        balance_cents: balance,
        status: balance <= 0 ? 'paid' : 'partially_paid',
      }
    }),
  )
  queryClient.setQueryData<InvoiceDetail>(['invoices', input.invoiceId], (old) => {
    if (!old) return old
    const payment: Payment = {
      id: paymentId,
      invoice_id: input.invoiceId,
      amount_cents: input.amountCents,
      method: input.method,
      paid_at: input.paidAt,
      note: input.note,
      created_at: now,
      updated_at: now,
      user_id: '',
      org_id: '',
    }
    const payments = [...old.payments, payment]
    const total = invoiceTotalCents(old.items)
    const paid = payments.reduce((sum, p) => sum + p.amount_cents, 0)
    return {
      ...old,
      payments,
      invoice: {
        ...old.invoice,
        status: total - paid <= 0 ? 'paid' : 'partially_paid',
      },
    }
  })

  await enqueue({
    table: 'payments',
    kind: 'rpc',
    payload: {
      fn: 'apply_payment',
      args: {
        p_id: paymentId,
        p_invoice_id: input.invoiceId,
        p_amount_cents: input.amountCents,
        p_method: input.method,
        p_paid_at: input.paidAt,
        p_note: input.note,
      },
    },
  })
  // Money in the door means this is an active customer — reconcile the stage.
  const clientId = queryClient.getQueryData<InvoiceDetail>(['invoices', input.invoiceId])
    ?.invoice.client_id
  if (clientId) await maybeAdvanceStage(clientId, 'active')
  confirmToast('Payment recorded')
}

/** Status from totals, mirroring apply_payment's recompute (sent when unpaid). */
function statusFromTotals(total: number, paid: number): InvoiceStatus {
  if (paid >= total && total > 0) return 'paid'
  if (paid > 0) return 'partially_paid'
  return 'sent'
}

/**
 * Reverse a payment with an offsetting negative line. apply_payment sums every
 * payment row from invoice_balances, so a negative amount drops `paid` and flips
 * the status back — append-only and auditable (the original row is never
 * deleted). The new line's id keeps the outbox RPC idempotent.
 */
export async function reversePayment(payment: Payment): Promise<void> {
  const reversalId = crypto.randomUUID()
  const now = new Date().toISOString()
  const amount = payment.amount_cents
  const invoiceId = payment.invoice_id
  const note = `Reversal of ${payment.id}`
  const paidAt = localToday()

  // Optimistic: drop paid/balance in the list + append the negative detail line.
  queryClient.setQueryData<InvoiceBalance[]>(['invoices'], (old) =>
    old?.map((row) => {
      if (row.invoice_id !== invoiceId) return row
      const paid = row.paid_cents - amount
      return {
        ...row,
        paid_cents: paid,
        balance_cents: row.total_cents - paid,
        status: statusFromTotals(row.total_cents, paid),
      }
    }),
  )
  queryClient.setQueryData<InvoiceDetail>(['invoices', invoiceId], (old) => {
    if (!old) return old
    const reversal: Payment = {
      id: reversalId,
      invoice_id: invoiceId,
      amount_cents: -amount,
      method: payment.method,
      paid_at: paidAt,
      note,
      created_at: now,
      updated_at: now,
      user_id: '',
      org_id: '',
    }
    const payments = [...old.payments, reversal]
    const total = invoiceTotalCents(old.items)
    const paid = payments.reduce((sum, p) => sum + p.amount_cents, 0)
    return {
      ...old,
      payments,
      invoice: { ...old.invoice, status: statusFromTotals(total, paid) },
    }
  })

  await enqueue({
    table: 'payments',
    kind: 'rpc',
    payload: {
      fn: 'apply_payment',
      args: {
        p_id: reversalId,
        p_invoice_id: invoiceId,
        p_amount_cents: -amount,
        p_method: payment.method,
        p_paid_at: paidAt,
        p_note: note,
      },
    },
  })
}

/**
 * Queue a real email of this invoice through the server-side email outbox.
 * Offline-safe (op waits in the client outbox); sent_at is stamped server-side
 * at actual delivery. The optimistic flip here is only draft → sent status.
 */
export async function emailInvoice(detail: InvoiceDetail): Promise<void> {
  if (!detail.client?.email) throw new Error('Client has no email')
  if (detail.invoice.status === 'draft') {
    patchInvoiceCaches(detail.invoice.id, { status: 'sent' })
    await enqueue({
      table: 'invoices',
      kind: 'update',
      payload: { id: detail.invoice.id, patch: { status: 'sent' } },
    })
  }
  await enqueue({
    table: 'email_outbox',
    kind: 'rpc',
    payload: {
      fn: 'queue_email',
      args: {
        p_id: crypto.randomUUID(),
        p_template: 'invoice_send',
        p_entity_id: detail.invoice.id,
      },
    },
  })
  confirmToast('Invoice email queued')
}

export async function markSent(id: string): Promise<void> {
  patchInvoiceCaches(id, { status: 'sent' })
  await enqueue({
    table: 'invoices',
    kind: 'update',
    payload: { id, patch: { status: 'sent' } },
  })
  confirmToast('Invoice marked sent')
}

/**
 * Void an invoice and return its work to billable. Voiding is the *compensating*
 * inverse of invoicing: the invoice itself stays on the books as 'void' (an
 * append-only financial record — correctly NOT a rewind), but each job it
 * invoiced goes back to 'done' so it isn't stranded at 'invoiced', and we append
 * an activity as the audit trail. Mirrors createInvoiceFromJobs' forward flip.
 *
 * Recorded payments are reversed first (offsetting negative lines), so voided
 * money never keeps counting as collected revenue. FIFO ordering guarantees the
 * reversals reach the server while the invoice is still live — apply_payment
 * refuses to recompute status on a row already marked 'void'.
 */
export async function voidInvoice(id: string): Promise<void> {
  const detail = queryClient.getQueryData<InvoiceDetail>(['invoices', id])

  const payments = detail?.payments ?? []
  const reversedIds = new Set(
    payments
      .filter((p) => p.amount_cents < 0)
      .map((p) => p.note.replace(/^Reversal of /, '')),
  )
  for (const payment of payments) {
    if (payment.amount_cents > 0 && !reversedIds.has(payment.id)) {
      await reversePayment(payment)
    }
  }

  patchInvoiceCaches(id, { status: 'void' })
  await enqueue({
    table: 'invoices',
    kind: 'update',
    payload: { id, patch: { status: 'void' } },
  })

  const jobIds = Array.from(
    new Set(
      (detail?.items ?? []).map((it) => it.job_id).filter((j): j is string => j !== null),
    ),
  )
  for (const jobId of jobIds) {
    restoreInvoicedJobInCaches(jobId)
    await enqueue({
      table: 'jobs',
      kind: 'update',
      payload: { id: jobId, patch: { status: 'done' } },
    })
  }

  const clientId = detail?.invoice.client_id
  if (jobIds.length > 0 && clientId) {
    await enqueue({
      table: 'activities',
      kind: 'upsert',
      payload: {
        id: crypto.randomUUID(),
        client_id: clientId,
        kind: 'note',
        body: `Voided invoice ${detail?.invoice.number ?? ''} — returned ${
          jobIds.length
        } job${jobIds.length === 1 ? '' : 's'} to Done`.trim(),
      },
    })
  }
  confirmToast('Invoice voided')
}

export async function recordReminder(id: string): Promise<void> {
  const remindedAt = new Date().toISOString()
  patchInvoiceCaches(id, { last_reminded_at: remindedAt })
  await enqueue({
    table: 'invoices',
    kind: 'update',
    payload: { id, patch: { last_reminded_at: remindedAt } },
  })
}

// ---------------------------------------------------------------------------
// Aging
// ---------------------------------------------------------------------------

export type AgingBucket = 'current' | '1-30' | '31-60' | '61-90' | '90+'

export const AGING_BUCKETS: AgingBucket[] = ['current', '1-30', '31-60', '61-90', '90+']

/** Theme text-color tint per aging bucket — shared by the board and Money. */
export const AGING_COLOR: Record<AgingBucket, string> = {
  current: 'text-sand',
  '1-30': 'text-sand',
  '31-60': 'text-khaki',
  '61-90': 'text-khaki',
  '90+': 'text-alert',
}

/** An invoice that still wants money: draft/sent/partially_paid with balance. */
export function isOpen(
  invoice: Pick<InvoiceBalance, 'status' | 'balance_cents'>,
): boolean {
  return (
    invoice.balance_cents > 0 &&
    (invoice.status === 'draft' ||
      invoice.status === 'sent' ||
      invoice.status === 'partially_paid')
  )
}

/** Bucket an open invoice by days overdue relative to its due date. */
export function agingBucket(
  invoice: Pick<InvoiceBalance, 'due_at'>,
  today: string,
): AgingBucket {
  if (!invoice.due_at) return 'current'
  const msPerDay = 24 * 60 * 60 * 1000
  const overdueDays = Math.round(
    (parseLocalDate(today).getTime() - parseLocalDate(invoice.due_at).getTime()) /
      msPerDay,
  )
  if (overdueDays <= 0) return 'current'
  if (overdueDays <= 30) return '1-30'
  if (overdueDays <= 60) return '31-60'
  if (overdueDays <= 90) return '61-90'
  return '90+'
}
