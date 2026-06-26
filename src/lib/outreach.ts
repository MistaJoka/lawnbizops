/**
 * Customer outreach deep links — free, native, offline-friendly. We don't send
 * anything ourselves; we open the device's SMS / email composer prefilled, and
 * the operator hits send. Android (the primary device) honors `sms:?body=`.
 */

/** Strip a phone number to the dialer-safe characters (digits and a leading +). */
function cleanPhone(phone: string): string {
  return phone.replace(/[^\d+]/g, '')
}

/** `sms:` deep link with a prefilled body. */
export function smsHref(phone: string, body: string): string {
  return `sms:${cleanPhone(phone)}?body=${encodeURIComponent(body)}`
}

/** `mailto:` deep link with a prefilled subject + body. */
export function mailtoHref(email: string, subject: string, body: string): string {
  return `mailto:${email.trim()}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

/** "On my way" text — sent on the drive over so the customer expects you. */
export function onMyWayMessage(
  business: string,
  clientName: string,
  place: string,
): string {
  const who = business.trim() ? ` This is ${business.trim()}.` : ''
  const dest = place.trim() ? ` to ${place.trim()}` : ''
  return `Hi ${clientName} —${who} On my way${dest} now. See you soon!`
}

/** Review-request text — sent after a job is done, with the Google review link. */
export function reviewRequestMessage(
  business: string,
  clientName: string,
  url: string,
): string {
  const from = business.trim() ? ` — ${business.trim()}` : ''
  return `Thanks for your business, ${clientName}! If you have a minute, we'd really appreciate a quick review: ${url.trim()}${from}`
}
