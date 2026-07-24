import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryClient } from '@/lib/queryClient'
import { enqueue } from '@/lib/outbox'
import { confirmToast } from '@/lib/toast'
import { localToday } from '@/lib/format'
import { addDaysISO } from '@/lib/dates'
import {
  invoiceTotalCents,
  taxCents,
  type Invoice,
  type InvoiceBalance,
  type InvoiceDetail,
  type InvoiceItem,
} from '@/features/invoices/hooks'
import { createOneOffJob, type JobPropertyContext } from '@/features/jobs/hooks'
import { maybeAdvanceStage } from '@/features/clients/hooks'
import type { Tables } from '@/lib/database.types'

export type Estimate = Tables<'estimates'>
export type EstimateItem = Tables<'estimate_items'>

export type EstimateStatus = 'draft' | 'sent' | 'accepted' | 'declined' | 'expired'

/** Property context an estimate detail screen needs (nested select shape). */
export interface EstimateProperty {
  id: string
  label: string
  address_line1: string
  city: string
  lat: number | null
  lng: number | null
  gate_code: string
  notes: string
}

export interface EstimateListRow extends Estimate {
  total_cents: number
  client: { name: string; phone: string } | null
}

/** An invoice already created from this estimate (deposit or final). */
export interface LinkedInvoice {
  invoice_id: string
  number: string | null
  status: string
  is_deposit: boolean
  subtotal_cents: number
}

export interface EstimateDetail {
  estimate: Estimate
  items: EstimateItem[]
  client: { id: string; name: string; phone: string; email?: string } | null
  property: EstimateProperty | null
  /** FINAL (non-deposit) invoice already created from this estimate, if any. */
  linkedInvoiceId: string | null
  /** Every invoice linked to this estimate — deposits first, then final. */
  linkedInvoices: LinkedInvoice[]
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

/** Shared so a route loader can warm the list on tab-intent (preload). */
export const estimatesQueryOptions = {
  queryKey: ['estimates'] as const,
  queryFn: async (): Promise<EstimateListRow[]> => {
    const { data, error } = await supabase
      .from('estimates')
      .select(
        '*, items:estimate_items(quantity, unit_price_cents), client:clients(name, phone)',
      )
      .order('issued_at', { ascending: false })
    if (error) throw error
    return data.map((row) => {
      const { items, ...estimate } = row
      return {
        ...estimate,
        total_cents: invoiceTotalCents(items),
        client: row.client ?? null,
      }
    })
  },
}

export function useEstimates() {
  return useQuery(estimatesQueryOptions)
}

export function useEstimate(id: string) {
  return useQuery({
    queryKey: ['estimates', id],
    queryFn: async (): Promise<EstimateDetail> => {
      const { data: estimate, error } = await supabase
        .from('estimates')
        .select('*')
        .eq('id', id)
        .single()
      if (error) throw error
      const { data: items, error: itemsError } = await supabase
        .from('estimate_items')
        .select('*')
        .eq('estimate_id', id)
        .order('sort_order')
      if (itemsError) throw itemsError
      const { data: client } = await supabase
        .from('clients')
        .select('id, name, phone, email')
        .eq('id', estimate.client_id)
        .maybeSingle()
      let property: EstimateProperty | null = null
      if (estimate.property_id) {
        const { data } = await supabase
          .from('properties')
          .select('id, label, address_line1, city, lat, lng, gate_code, notes')
          .eq('id', estimate.property_id)
          .maybeSingle()
        property = data ?? null
      }
      // invoice_balances carries estimate_id + is_deposit + subtotal (0045) —
      // one query gives every linked invoice WITH the amount the final
      // conversion must deduct. Older backends without the columns yield [].
      const { data: linked } = await supabase
        .from('invoice_balances')
        .select('invoice_id, number, status, is_deposit, subtotal_cents')
        .eq('estimate_id', id)
      const linkedInvoices = ((linked ?? []) as LinkedInvoice[]).map((li) => ({
        ...li,
        is_deposit: li.is_deposit ?? false,
        subtotal_cents: li.subtotal_cents ?? 0,
      }))
      return {
        estimate,
        items,
        client: client ?? null,
        property,
        linkedInvoiceId: linkedInvoices.find((li) => !li.is_deposit)?.invoice_id ?? null,
        linkedInvoices,
      }
    },
  })
}

// ---------------------------------------------------------------------------
// Writes (optimistic cache + outbox)
// ---------------------------------------------------------------------------

/** Apply a patch to an estimate in both the list and detail caches. */
function patchEstimateCaches(id: string, patch: Partial<Estimate>): void {
  queryClient.setQueryData<EstimateListRow[]>(['estimates'], (old) =>
    old?.map((row) => (row.id === id ? { ...row, ...patch } : row)),
  )
  queryClient.setQueryData<EstimateDetail>(['estimates', id], (old) =>
    old ? { ...old, estimate: { ...old.estimate, ...patch } } : old,
  )
}

export interface EstimateLineInput {
  description: string
  quantity: number
  unit_price_cents: number
}

export interface CreateEstimateInput {
  clientId: string
  client: { name: string; phone: string } | null
  propertyId: string | null
  property: EstimateProperty | null
  items: EstimateLineInput[]
  notes: string
  validUntil: string | null
}

/**
 * Build a draft estimate (number is server-assigned on sync). FIFO order
 * matters: the estimate upsert must land before its items.
 */
export async function createEstimate(input: CreateEstimateInput): Promise<string> {
  const id = crypto.randomUUID()
  const issuedAt = localToday()

  const estimateRow = {
    id,
    client_id: input.clientId,
    property_id: input.propertyId,
    status: 'draft' as const,
    issued_at: issuedAt,
    valid_until: input.validUntil,
    notes: input.notes,
  }
  const itemRows = input.items.map((item, index) => ({
    id: crypto.randomUUID(),
    estimate_id: id,
    description: item.description,
    quantity: item.quantity,
    unit_price_cents: item.unit_price_cents,
    sort_order: index,
  }))

  const now = new Date().toISOString()

  // Optimistic caches so the detail screen renders fully offline.
  const cachedEstimate: Estimate = {
    ...estimateRow,
    number: null,
    // Placeholder until the server assigns the real default on sync.
    approval_token: crypto.randomUUID(),
    decline_reason: '',
    sent_at: null,
    created_at: now,
    updated_at: now,
    user_id: '',
    org_id: '',
  }
  const cachedItems: EstimateItem[] = itemRows.map((item) => ({
    ...item,
    created_at: now,
    updated_at: now,
    user_id: '',
    org_id: '',
  }))
  queryClient.setQueryData<EstimateDetail>(['estimates', id], {
    estimate: cachedEstimate,
    items: cachedItems,
    client: input.client ? { id: input.clientId, ...input.client } : null,
    property: input.property,
    linkedInvoiceId: null,
    linkedInvoices: [],
  })
  const listRow: EstimateListRow = {
    ...cachedEstimate,
    total_cents: invoiceTotalCents(itemRows),
    client: input.client,
  }
  queryClient.setQueryData<EstimateListRow[]>(['estimates'], (old) =>
    old ? [listRow, ...old] : [listRow],
  )

  // FIFO: estimate → items.
  await enqueue({ table: 'estimates', kind: 'upsert', payload: estimateRow })
  for (const item of itemRows) {
    await enqueue({ table: 'estimate_items', kind: 'upsert', payload: item })
  }
  return id
}

/** A line on the edit screen — carries its row id when it already exists. */
export interface EstimateLineEdit extends EstimateLineInput {
  id?: string
}

export interface UpdateEstimateInput {
  items: EstimateLineEdit[]
  notes: string
  validUntil: string | null
}

/**
 * Edit a draft/sent estimate in place: patch its fields and reconcile line
 * items (existing ids update, new lines insert, missing lines delete). FIFO
 * order matters: the estimate update lands before its item writes.
 */
export async function updateEstimate(
  detail: EstimateDetail,
  input: UpdateEstimateInput,
): Promise<void> {
  const estimateId = detail.estimate.id
  const patch = { notes: input.notes, valid_until: input.validUntil }
  const itemRows = input.items.map((item, index) => ({
    id: item.id ?? crypto.randomUUID(),
    estimate_id: estimateId,
    description: item.description,
    quantity: item.quantity,
    unit_price_cents: item.unit_price_cents,
    sort_order: index,
  }))
  const keptIds = new Set(itemRows.map((item) => item.id))
  const removedIds = detail.items
    .filter((item) => !keptIds.has(item.id))
    .map((item) => item.id)

  const now = new Date().toISOString()
  const cachedItems: EstimateItem[] = itemRows.map((item) => {
    const existing = detail.items.find((it) => it.id === item.id)
    return existing
      ? { ...existing, ...item, updated_at: now }
      : { ...item, created_at: now, updated_at: now, user_id: '', org_id: '' }
  })
  queryClient.setQueryData<EstimateDetail>(['estimates', estimateId], (old) =>
    old ? { ...old, estimate: { ...old.estimate, ...patch }, items: cachedItems } : old,
  )
  queryClient.setQueryData<EstimateListRow[]>(['estimates'], (old) =>
    old?.map((row) =>
      row.id === estimateId
        ? { ...row, ...patch, total_cents: invoiceTotalCents(itemRows) }
        : row,
    ),
  )

  // FIFO: estimate → item upserts → item deletes.
  await enqueue({
    table: 'estimates',
    kind: 'update',
    payload: { id: estimateId, patch },
  })
  for (const item of itemRows) {
    await enqueue({ table: 'estimate_items', kind: 'upsert', payload: item })
  }
  for (const id of removedIds) {
    await enqueue({ table: 'estimate_items', kind: 'delete', payload: { id } })
  }
  confirmToast('Estimate updated')
}

/**
 * Delete a draft estimate for good (junk-draft cleanup). Call sites guard on
 * status === 'draft' — sent/answered quotes keep their history. FIFO: items
 * before the estimate row (FK).
 */
export async function deleteEstimate(detail: EstimateDetail): Promise<void> {
  const estimateId = detail.estimate.id
  queryClient.setQueryData<EstimateListRow[]>(['estimates'], (old) =>
    old?.filter((row) => row.id !== estimateId),
  )
  queryClient.removeQueries({ queryKey: ['estimates', estimateId] })
  for (const item of detail.items) {
    await enqueue({ table: 'estimate_items', kind: 'delete', payload: { id: item.id } })
  }
  await enqueue({ table: 'estimates', kind: 'delete', payload: { id: estimateId } })
  confirmToast('Draft deleted')
}

/**
 * Queue a real email of this estimate (with its approval link) through the
 * server-side email outbox. Offline-safe: the op waits in the client outbox,
 * the send-email worker delivers when it lands. sent_at is stamped server-side
 * at actual delivery — the optimistic flip here is only draft → sent status.
 */
export async function emailEstimate(detail: EstimateDetail): Promise<void> {
  if (!detail.client?.email) throw new Error('Client has no email')
  if (detail.estimate.status === 'draft') {
    await setEstimateStatus(detail.estimate.id, 'sent')
  }
  await enqueue({
    table: 'email_outbox',
    kind: 'rpc',
    payload: {
      fn: 'queue_email',
      args: {
        p_id: crypto.randomUUID(),
        p_template: 'estimate_send',
        p_entity_id: detail.estimate.id,
      },
    },
  })
  confirmToast('Estimate email queued')
}

export async function setEstimateStatus(
  id: string,
  status: EstimateStatus,
): Promise<void> {
  patchEstimateCaches(id, { status })
  await enqueue({
    table: 'estimates',
    kind: 'update',
    payload: { id, patch: { status } },
  })
  // Sending a quote means this client is now Quoted — reconcile the stage.
  if (status === 'sent') {
    const detail = queryClient.getQueryData<EstimateDetail>(['estimates', id])
    if (detail?.estimate.client_id) {
      await maybeAdvanceStage(detail.estimate.client_id, 'quoted')
    }
  }
}

/**
 * Operator-side decline with a captured loss reason (0044) — the win/loss
 * analysis primitive. Reason may be '' when the operator skips it.
 */
export async function declineEstimate(id: string, reason: string): Promise<void> {
  const decline_reason = reason.trim().slice(0, 500)
  patchEstimateCaches(id, { status: 'declined', decline_reason })
  await enqueue({
    table: 'estimates',
    kind: 'update',
    payload: { id, patch: { status: 'declined', decline_reason } },
  })
}

/**
 * Clone a declined/expired estimate into a fresh draft (same client, property,
 * and line items; a new 30-day valid-until) so a stale quote can be re-sent
 * without re-keying it. Returns the new estimate id for navigation.
 */
export async function renewEstimate(detail: EstimateDetail): Promise<string> {
  return createEstimate({
    clientId: detail.estimate.client_id,
    client: detail.client
      ? { name: detail.client.name, phone: detail.client.phone }
      : null,
    propertyId: detail.estimate.property_id,
    property: detail.property,
    items: detail.items.map((it) => ({
      description: it.description,
      quantity: it.quantity,
      unit_price_cents: it.unit_price_cents,
    })),
    notes: detail.estimate.notes,
    validUntil: addDaysISO(localToday(), 30),
  })
}

/**
 * Collect a deposit on an accepted estimate: a normal draft invoice (same
 * email / payment / A/R lifecycle) with one "Deposit — EST-x" line, flagged
 * is_deposit so the final conversion can deduct it. Returns the invoice id.
 */
export async function createDepositInvoice(
  detail: EstimateDetail,
  amountCents: number,
  defaultDueDays: number,
  taxBps: number,
): Promise<string> {
  const id = crypto.randomUUID()
  const issuedAt = localToday()
  const dueAt = addDaysISO(issuedAt, defaultDueDays)

  const invoiceRow = {
    id,
    client_id: detail.estimate.client_id,
    estimate_id: detail.estimate.id,
    status: 'draft' as const,
    issued_at: issuedAt,
    due_at: dueAt,
    notes: '',
    tax_bps: taxBps,
    is_deposit: true,
  }
  const itemRow = {
    id: crypto.randomUUID(),
    invoice_id: id,
    job_id: null,
    description: `Deposit — ${detail.estimate.number ?? 'estimate'}`,
    quantity: 1,
    unit_price_cents: amountCents,
    sort_order: 0,
  }

  const total = amountCents + taxCents(amountCents, taxBps)
  const now = new Date().toISOString()

  const cachedInvoice: Invoice = {
    ...invoiceRow,
    number: null,
    last_reminded_at: null,
    sent_at: null,
    created_at: now,
    updated_at: now,
    user_id: '',
    org_id: '',
  }
  queryClient.setQueryData<InvoiceDetail>(['invoices', id], {
    invoice: cachedInvoice,
    items: [{ ...itemRow, created_at: now, updated_at: now, user_id: '', org_id: '' }],
    payments: [],
    client: detail.client,
  })
  const balanceRow: InvoiceBalance = {
    invoice_id: id,
    client_id: detail.estimate.client_id,
    number: null,
    status: 'draft',
    issued_at: issuedAt,
    due_at: dueAt,
    last_reminded_at: null,
    total_cents: total,
    paid_cents: 0,
    balance_cents: total,
    subtotal_cents: amountCents,
    tax_bps: taxBps,
    tax_cents: total - amountCents,
    client: detail.client
      ? { name: detail.client.name, phone: detail.client.phone }
      : null,
  }
  queryClient.setQueryData<InvoiceBalance[]>(['invoices'], (old) =>
    old ? [balanceRow, ...old] : [balanceRow],
  )
  queryClient.setQueryData<EstimateDetail>(['estimates', detail.estimate.id], (old) =>
    old
      ? {
          ...old,
          linkedInvoices: [
            ...(old.linkedInvoices ?? []),
            {
              invoice_id: id,
              number: null,
              status: 'draft',
              is_deposit: true,
              subtotal_cents: amountCents,
            },
          ],
        }
      : old,
  )

  // FIFO: invoice → item.
  await enqueue({ table: 'invoices', kind: 'upsert', payload: invoiceRow })
  await enqueue({ table: 'invoice_items', kind: 'upsert', payload: itemRow })
  confirmToast('Deposit invoice created')
  return id
}

/**
 * Create a draft invoice from an accepted estimate (estimate_id linked, items
 * copied). Deposit invoices already collected against this estimate are
 * deducted with a negative "Less deposit received" line, so the final bill is
 * the remainder. Reuses the invoice cache shapes so the invoice detail renders
 * fully offline. Returns the new invoice id for navigation.
 */
export async function convertToInvoice(
  detail: EstimateDetail,
  defaultDueDays: number,
  taxBps: number,
): Promise<string> {
  const id = crypto.randomUUID()
  const issuedAt = localToday()
  const dueAt = addDaysISO(issuedAt, defaultDueDays)

  const invoiceRow = {
    id,
    client_id: detail.estimate.client_id,
    estimate_id: detail.estimate.id,
    status: 'draft' as const,
    issued_at: issuedAt,
    due_at: dueAt,
    notes: '',
    tax_bps: taxBps,
  }
  const deposits = (detail.linkedInvoices ?? []).filter(
    (li) => li.is_deposit && li.status !== 'void' && li.subtotal_cents > 0,
  )
  const itemRows = [
    ...detail.items.map((item, index) => ({
      id: crypto.randomUUID(),
      invoice_id: id,
      job_id: null,
      description: item.description,
      quantity: item.quantity,
      unit_price_cents: item.unit_price_cents,
      sort_order: index,
    })),
    ...deposits.map((dep, index) => ({
      id: crypto.randomUUID(),
      invoice_id: id,
      job_id: null,
      description: `Less deposit received (${dep.number ?? 'deposit'})`,
      quantity: 1,
      unit_price_cents: -dep.subtotal_cents,
      sort_order: detail.items.length + index,
    })),
  ]

  const subtotal = invoiceTotalCents(itemRows)
  const total = subtotal + taxCents(subtotal, taxBps)
  const now = new Date().toISOString()

  const cachedInvoice: Invoice = {
    ...invoiceRow,
    number: null,
    is_deposit: false,
    last_reminded_at: null,
    sent_at: null,
    created_at: now,
    updated_at: now,
    user_id: '',
    org_id: '',
  }
  const cachedItems: InvoiceItem[] = itemRows.map((item) => ({
    ...item,
    created_at: now,
    updated_at: now,
    user_id: '',
    org_id: '',
  }))
  queryClient.setQueryData<InvoiceDetail>(['invoices', id], {
    invoice: cachedInvoice,
    items: cachedItems,
    payments: [],
    client: detail.client,
  })
  const balanceRow: InvoiceBalance = {
    invoice_id: id,
    client_id: detail.estimate.client_id,
    number: null,
    status: 'draft',
    issued_at: issuedAt,
    due_at: dueAt,
    last_reminded_at: null,
    total_cents: total,
    paid_cents: 0,
    balance_cents: total,
    subtotal_cents: subtotal,
    tax_bps: taxBps,
    tax_cents: total - subtotal,
    client: detail.client
      ? { name: detail.client.name, phone: detail.client.phone }
      : null,
  }
  queryClient.setQueryData<InvoiceBalance[]>(['invoices'], (old) =>
    old ? [balanceRow, ...old] : [balanceRow],
  )
  queryClient.setQueryData<EstimateDetail>(['estimates', detail.estimate.id], (old) =>
    old
      ? {
          ...old,
          linkedInvoiceId: id,
          linkedInvoices: [
            ...(old.linkedInvoices ?? []),
            {
              invoice_id: id,
              number: null,
              status: 'draft',
              is_deposit: false,
              subtotal_cents: subtotal,
            },
          ],
        }
      : old,
  )

  // FIFO: invoice → items.
  await enqueue({ table: 'invoices', kind: 'upsert', payload: invoiceRow })
  for (const item of itemRows) {
    await enqueue({ table: 'invoice_items', kind: 'upsert', payload: item })
  }
  return id
}

/**
 * Create a one-off job from an accepted estimate. Requires the estimate to
 * have a property (jobs are property-bound). Returns the new job id.
 */
export async function createJobFromEstimate(
  detail: EstimateDetail,
  scheduledDate: string,
): Promise<string> {
  const property = detail.property
  if (!property) throw new Error('Estimate has no property — pick one first.')

  const id = crypto.randomUUID()
  const firstLine = detail.items[0]?.description ?? 'Estimate work'
  const propertyContext: JobPropertyContext = {
    ...property,
    client: detail.client,
  }
  await createOneOffJob(
    {
      id,
      property_id: property.id,
      service_id: null,
      scheduled_date: scheduledDate,
      price_cents: invoiceTotalCents(detail.items),
      title: `${detail.estimate.number ?? 'Estimate'} — ${firstLine}`,
      notes: detail.estimate.notes,
    },
    propertyContext,
  )
  return id
}
