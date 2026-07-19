// Drains the email_outbox: claims queued rows (claim_queued_emails RPC),
// renders each template from live DB rows, POSTs to Resend, then stamps
// sent_at on the row and the document and appends a doc_sent activity.
//
// Triggered two ways — both are just "kick the worker", safe to double-fire:
//   - pg_cron → kick_email_drain() with the x-drain-key header (works with the
//     app closed; this is what makes reminders reliable)
//   - the app right after an outbox flush, with the user's JWT (instant feel)
//
// Failure model mirrors the client outbox: transient send errors put the row
// back to 'queued' (retried next kick), 5 failed attempts or an unrenderable
// entity parks it as 'failed'.
//
// verify_jwt is OFF for this function because pg_cron's kick carries no JWT —
// authorization is enforced in the body instead (drain key or a live user JWT).

import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2?target=deno'
import {
  APP_URL,
  corsHeaders,
  ctaButton,
  emailShell,
  escapeHtml,
  formatCents,
  itemsTable,
  resendKey,
  sendViaResend,
  type OutboundEmail,
} from '../_shared/email.ts'

interface OutboxRow {
  id: string
  org_id: string
  template: 'estimate_send' | 'invoice_send' | 'invoice_overdue' | 'job_reminder'
  entity_id: string
  to_email: string
  attempts: number
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const service = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // Authorize: the cron drain key, or any signed-in user (draining only sends
  // what queue_email already validated — kicking it is harmless).
  const drainKey = Deno.env.get('EMAIL_DRAIN_KEY')
  const viaCron = !!drainKey && req.headers.get('x-drain-key') === drainKey
  if (!viaCron) {
    const supa = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } },
    )
    const { data } = await supa.auth.getUser()
    if (!data.user) return json({ error: 'unauthorized' }, 401)
  }

  try {
    resendKey() // fail fast: leave rows queued instead of burning attempts
  } catch {
    return json({ error: 'email-not-configured' }, 503)
  }

  const { data: batch, error: claimError } = await service.rpc('claim_queued_emails', {
    p_limit: 20,
  })
  if (claimError) return json({ error: claimError.message }, 500)

  let sent = 0
  let failed = 0
  for (const row of (batch ?? []) as OutboxRow[]) {
    try {
      const msg = await render(service, row)
      const providerId = await sendViaResend(msg)
      await service
        .from('email_outbox')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          provider_id: providerId,
          error: '',
        })
        .eq('id', row.id)
      await stampDocument(service, row)
      sent++
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      const terminal = row.attempts >= 5 || message.startsWith('unrenderable')
      await service
        .from('email_outbox')
        .update({ status: terminal ? 'failed' : 'queued', error: message.slice(0, 500) })
        .eq('id', row.id)
      failed++
    }
  }
  return json({ sent, failed })
})

async function businessName(supa: SupabaseClient, orgId: string): Promise<string> {
  const { data } = await supa
    .from('business_settings')
    .select('business_name')
    .eq('org_id', orgId)
    .maybeSingle()
  return data?.business_name || 'Your service provider'
}

async function render(supa: SupabaseClient, row: OutboxRow): Promise<OutboundEmail> {
  const business = await businessName(supa, row.org_id)

  if (row.template === 'estimate_send') {
    const { data: est } = await supa
      .from('estimates')
      .select('id, number, notes, valid_until, approval_token, client:clients(name)')
      .eq('id', row.entity_id)
      .maybeSingle()
    if (!est) throw new Error('unrenderable: estimate gone')
    const { data: items } = await supa
      .from('estimate_items')
      .select('description, quantity, unit_price_cents')
      .eq('estimate_id', row.entity_id)
      .order('sort_order')
    const lines = items ?? []
    const total = lines.reduce((s, i) => s + Math.round(i.quantity * i.unit_price_cents), 0)
    const client = (est.client as { name?: string } | null)?.name ?? 'there'
    const approvalUrl = `${APP_URL}/e/${est.approval_token}`
    const body = `
      <p style="font-size:15px;margin:0 0 12px;">Hi ${escapeHtml(client.split(' ')[0])},</p>
      <p style="font-size:15px;margin:0 0 16px;">Here's your estimate${est.number ? ` <strong>${escapeHtml(est.number)}</strong>` : ''} — review and approve it online, no account needed.</p>
      ${itemsTable(lines, total, 'Estimate total')}
      ${est.valid_until ? `<p style="font-size:13px;color:#666;margin:8px 0 0;">Valid through ${escapeHtml(est.valid_until)}.</p>` : ''}
      ${est.notes ? `<p style="font-size:14px;margin:12px 0 0;white-space:pre-wrap;">${escapeHtml(est.notes)}</p>` : ''}
      ${ctaButton(approvalUrl, 'Review & approve')}
      <p style="font-size:12px;color:#888;margin:8px 0 0;">Or copy this link: ${approvalUrl}</p>`
    return {
      to: row.to_email,
      subject: `Estimate${est.number ? ` ${est.number}` : ''} from ${business}`,
      html: emailShell(business, body),
    }
  }

  if (row.template === 'invoice_send' || row.template === 'invoice_overdue') {
    const { data: inv } = await supa
      .from('invoices')
      .select('id, number, due_at, notes, client:clients(name)')
      .eq('id', row.entity_id)
      .maybeSingle()
    if (!inv) throw new Error('unrenderable: invoice gone')
    const { data: items } = await supa
      .from('invoice_items')
      .select('description, quantity, unit_price_cents')
      .eq('invoice_id', row.entity_id)
      .order('sort_order')
    const { data: bal } = await supa
      .from('invoice_balances')
      .select('total_cents, paid_cents, balance_cents')
      .eq('invoice_id', row.entity_id)
      .maybeSingle()
    const lines = items ?? []
    const total = bal?.total_cents ?? lines.reduce((s, i) => s + Math.round(i.quantity * i.unit_price_cents), 0)
    const balance = bal?.balance_cents ?? total
    const client = (inv.client as { name?: string } | null)?.name ?? 'there'
    const overdue = row.template === 'invoice_overdue'
    const intro = overdue
      ? `Just a friendly reminder that invoice${inv.number ? ` <strong>${escapeHtml(inv.number)}</strong>` : ''} has an open balance of <strong>${formatCents(balance)}</strong>. No rush — and thank you as always for the business!`
      : `Here's your invoice${inv.number ? ` <strong>${escapeHtml(inv.number)}</strong>` : ''}.`
    const body = `
      <p style="font-size:15px;margin:0 0 12px;">Hi ${escapeHtml(client.split(' ')[0])},</p>
      <p style="font-size:15px;margin:0 0 16px;">${intro}</p>
      ${itemsTable(lines, total, 'Invoice total')}
      ${bal && bal.paid_cents > 0 ? `<p style="font-size:14px;margin:8px 0 0;">Paid so far: ${formatCents(bal.paid_cents)} · <strong>Balance due: ${formatCents(balance)}</strong></p>` : ''}
      ${inv.due_at ? `<p style="font-size:13px;color:#666;margin:8px 0 0;">Due ${escapeHtml(inv.due_at)}.</p>` : ''}
      ${inv.notes ? `<p style="font-size:14px;margin:12px 0 0;white-space:pre-wrap;">${escapeHtml(inv.notes)}</p>` : ''}`
    return {
      to: row.to_email,
      subject: overdue
        ? `Reminder — invoice${inv.number ? ` ${inv.number}` : ''} from ${business}`
        : `Invoice${inv.number ? ` ${inv.number}` : ''} from ${business}`,
      html: emailShell(business, body),
    }
  }

  // job_reminder: same-day service visit heads-up.
  const { data: job } = await supa
    .from('jobs')
    .select('id, title, scheduled_date, start_time, property:properties(label, address_line1, client:clients(name))')
    .eq('id', row.entity_id)
    .maybeSingle()
  if (!job) throw new Error('unrenderable: job gone')
  const prop = job.property as {
    label?: string
    address_line1?: string
    client?: { name?: string } | null
  } | null
  const client = prop?.client?.name ?? 'there'
  const where = prop?.label || prop?.address_line1 || 'your property'
  const body = `
    <p style="font-size:15px;margin:0 0 12px;">Hi ${escapeHtml(client.split(' ')[0])},</p>
    <p style="font-size:15px;margin:0;">A heads-up that we're scheduled at <strong>${escapeHtml(where)}</strong> today${job.start_time ? ` around ${escapeHtml(job.start_time)}` : ''}${job.title ? ` for ${escapeHtml(job.title)}` : ''}. See you soon!</p>`
  return {
    to: row.to_email,
    subject: `${business} — service visit today`,
    html: emailShell(business, body),
  }
}

/** After a successful send: stamp the document + append the audit activity. */
async function stampDocument(supa: SupabaseClient, row: OutboxRow): Promise<void> {
  const now = new Date().toISOString()

  if (row.template === 'estimate_send') {
    const { data: est } = await supa
      .from('estimates')
      .select('number, status, client_id')
      .eq('id', row.entity_id)
      .maybeSingle()
    await supa
      .from('estimates')
      .update({ sent_at: now, ...(est?.status === 'draft' ? { status: 'sent' } : {}) })
      .eq('id', row.entity_id)
    if (est?.client_id) {
      await supa.from('activities').insert({
        org_id: row.org_id,
        user_id: null,
        client_id: est.client_id,
        kind: 'doc_sent',
        body: `Emailed estimate ${est.number ?? ''} to ${row.to_email}`.replace('  ', ' '),
      })
    }
    return
  }

  if (row.template === 'invoice_send' || row.template === 'invoice_overdue') {
    const { data: inv } = await supa
      .from('invoices')
      .select('number, status, client_id')
      .eq('id', row.entity_id)
      .maybeSingle()
    const patch: Record<string, unknown> =
      row.template === 'invoice_send'
        ? { sent_at: now, ...(inv?.status === 'draft' ? { status: 'sent' } : {}) }
        : { last_reminded_at: now }
    await supa.from('invoices').update(patch).eq('id', row.entity_id)
    if (inv?.client_id) {
      await supa.from('activities').insert({
        org_id: row.org_id,
        user_id: null,
        client_id: inv.client_id,
        kind: 'doc_sent',
        body:
          row.template === 'invoice_send'
            ? `Emailed invoice ${inv.number ?? ''} to ${row.to_email}`.replace('  ', ' ')
            : `Emailed a payment reminder for ${inv.number ?? 'an invoice'} to ${row.to_email}`,
      })
    }
    return
  }

  // job_reminder: activity only — nothing to stamp on the job itself.
  const { data: job } = await supa
    .from('jobs')
    .select('property:properties(client_id)')
    .eq('id', row.entity_id)
    .maybeSingle()
  const clientId = (job?.property as { client_id?: string } | null)?.client_id
  if (clientId) {
    await supa.from('activities').insert({
      org_id: row.org_id,
      user_id: null,
      client_id: clientId,
      kind: 'doc_sent',
      body: `Emailed a visit reminder to ${row.to_email}`,
    })
  }
}
