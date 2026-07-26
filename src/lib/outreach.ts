/**
 * Customer outreach deep links — free, native, offline-friendly. We don't send
 * anything ourselves; we open the device's SMS / email composer prefilled, and
 * the operator hits send. Android (the primary device) honors `sms:?body=`.
 */

/** Strip a phone number to the dialer-safe characters (digits and a leading +). */
function cleanPhone(phone: string): string {
  return phone.replace(/[^\d+]/g, '')
}

/**
 * `tel:` deep link. Dialers tolerate punctuation, but clean it anyway so every
 * contact affordance in the app builds its href exactly one way.
 */
export function telHref(phone: string): string {
  return `tel:${cleanPhone(phone)}`
}

/**
 * `sms:` deep link, body optional. Cleaning is NOT cosmetic here: an sms: URI
 * carrying spaces and parens ("sms:(954) 555-0188") is invalid per RFC 3966,
 * and some Android messaging apps answer it by opening a compose window with
 * no recipient — the operator taps Text and gets a blank message. Every sms:
 * link in the app must be built through this.
 */
export function smsHref(phone: string, body?: string): string {
  const to = `sms:${cleanPhone(phone)}`
  return body ? `${to}?body=${encodeURIComponent(body)}` : to
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

/** Appointment-reminder text — sent the day before so tomorrow isn't a surprise. */
export function appointmentReminderMessage(
  business: string,
  clientName: string,
  when: string,
): string {
  const who = business.trim() ? ` This is ${business.trim()}.` : ''
  return `Hi ${clientName} —${who} Friendly reminder: we're scheduled to be out ${when.trim()}. Reply here if anything changed!`
}

/** Quote follow-up text — for a sent estimate that's sat unanswered a few days. */
export function quoteFollowUpMessage(
  clientName: string,
  number: string,
  amount: string,
): string {
  const which = number.trim() ? ` ${number.trim()}` : ''
  return `Hi ${clientName}, just checking in on the estimate${which} (${amount}). Happy to answer questions or adjust the scope — want us to get you on the schedule?`
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
