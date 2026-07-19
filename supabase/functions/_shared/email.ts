// Shared config for the send-email Edge Function.
//
// ACTIVATION (one-time):
//   1. Create a Resend account (free tier: 100 emails/day) and verify your
//      sending domain (DNS records — a Gmail from-address cannot work under
//      DMARC).
//   2. Set function secrets:
//        supabase secrets set RESEND_API_KEY=re_... \
//                             EMAIL_FROM='Your Business <billing@yourdomain.com>' \
//                             APP_URL=https://mistajoka.github.io/lawnbizops \
//                             EMAIL_DRAIN_KEY=<any long random string>
//   3. Vault secrets (SQL editor) so pg_cron can kick the drain:
//        select vault.create_secret('https://<ref>.supabase.co/functions/v1/send-email', 'send_email_url');
//        select vault.create_secret('<same value as EMAIL_DRAIN_KEY>', 'send_email_drain_key');
//
// Until then the function returns 503 and queued emails simply wait — the seam
// is live, the send path is dormant (same pattern as _shared/stripe.ts).

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

export const APP_URL = Deno.env.get('APP_URL') ?? 'http://localhost:5173'

export function resendKey(): string {
  const key = Deno.env.get('RESEND_API_KEY')
  if (!key) throw new Error('email-not-configured')
  return key
}

export function emailFrom(): string {
  const from = Deno.env.get('EMAIL_FROM')
  if (!from) throw new Error('email-not-configured')
  return from
}

export interface OutboundEmail {
  to: string
  subject: string
  html: string
}

/** POST to Resend; returns the provider message id. Throws on non-2xx. */
export async function sendViaResend(msg: OutboundEmail): Promise<string> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: emailFrom(), to: [msg.to], subject: msg.subject, html: msg.html }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`resend ${res.status}: ${body.slice(0, 300)}`)
  }
  const json = (await res.json()) as { id?: string }
  return json.id ?? ''
}

export function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

export function escapeHtml(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

/** Minimal, client-safe HTML shell — inline styles only, renders everywhere. */
export function emailShell(businessName: string, bodyHtml: string): string {
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#f4f4f2;">
  <div style="max-width:560px;margin:0 auto;padding:24px 16px;font-family:Arial,Helvetica,sans-serif;color:#1c1e21;">
    <p style="font-size:18px;font-weight:bold;margin:0 0 16px;">${escapeHtml(businessName)}</p>
    <div style="background:#ffffff;border:1px solid #ddd;border-radius:8px;padding:20px;">
      ${bodyHtml}
    </div>
    <p style="font-size:12px;color:#888;margin:16px 0 0;">Sent by ${escapeHtml(businessName)} via LawnBizOps.</p>
  </div>
</body></html>`
}

export function itemsTable(
  items: { description: string; quantity: number; unit_price_cents: number }[],
  totalCents: number,
  totalLabel: string,
): string {
  const rows = items
    .map((i) => {
      const line = Math.round(i.quantity * i.unit_price_cents)
      const qty = i.quantity !== 1 ? ` × ${i.quantity}` : ''
      return `<tr>
        <td style="padding:6px 0;border-bottom:1px solid #eee;">${escapeHtml(i.description)}${qty}</td>
        <td style="padding:6px 0;border-bottom:1px solid #eee;text-align:right;">${formatCents(line)}</td>
      </tr>`
    })
    .join('')
  return `<table style="width:100%;border-collapse:collapse;font-size:14px;">
    ${rows}
    <tr><td style="padding:10px 0;font-weight:bold;">${escapeHtml(totalLabel)}</td>
    <td style="padding:10px 0;font-weight:bold;text-align:right;">${formatCents(totalCents)}</td></tr>
  </table>`
}

export function ctaButton(href: string, label: string): string {
  return `<p style="margin:20px 0 4px;">
    <a href="${href}" style="display:inline-block;background:#e8622c;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:16px;font-weight:bold;">${escapeHtml(label)}</a>
  </p>`
}
