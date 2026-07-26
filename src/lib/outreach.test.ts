import { describe, expect, it } from 'vitest'
import {
  appointmentReminderMessage,
  mailtoHref,
  onMyWayMessage,
  reviewRequestMessage,
  smsHref,
  telHref,
} from './outreach'

describe('smsHref', () => {
  it('strips formatting from the number and url-encodes the body', () => {
    const href = smsHref('(305) 555-0100', 'On my way!')
    expect(href).toBe('sms:3055550100?body=On%20my%20way!')
  })

  it('keeps a leading + for international numbers', () => {
    expect(smsHref('+1 305 555 0100', 'hi')).toBe('sms:+13055550100?body=hi')
  })
})

describe('telHref / bare smsHref', () => {
  // Dialers tolerate punctuation in tel:, but sms: URIs with spaces and parens
  // are invalid per RFC 3966 and some Android messaging apps open with an empty
  // recipient — the operator taps Text and gets a blank compose window.
  it('strips punctuation so the recipient always lands', () => {
    expect(telHref('(954) 555-0188')).toBe('tel:9545550188')
    expect(smsHref('(954) 555-0188')).toBe('sms:9545550188')
  })

  it('emits no query string when there is no body to prefill', () => {
    expect(smsHref('9545550188')).toBe('sms:9545550188')
    expect(smsHref('9545550188', '')).toBe('sms:9545550188')
  })

  it('keeps the international + on both schemes', () => {
    expect(telHref('+1 (954) 555-0188')).toBe('tel:+19545550188')
    expect(smsHref('+1 (954) 555-0188')).toBe('sms:+19545550188')
  })
})

describe('mailtoHref', () => {
  it('encodes subject and body', () => {
    expect(mailtoHref('a@b.com', 'Hi there', 'Body & stuff')).toBe(
      'mailto:a@b.com?subject=Hi%20there&body=Body%20%26%20stuff',
    )
  })
})

describe('onMyWayMessage', () => {
  it('includes business, client, and destination', () => {
    expect(onMyWayMessage('Pierce Lawn', 'Sam', '12 Oak St')).toBe(
      'Hi Sam — This is Pierce Lawn. On my way to 12 Oak St now. See you soon!',
    )
  })

  it('omits the business and place clauses when blank', () => {
    expect(onMyWayMessage('', 'Sam', '')).toBe('Hi Sam — On my way now. See you soon!')
  })
})

describe('reviewRequestMessage', () => {
  it('includes the review url and signs off with the business', () => {
    expect(reviewRequestMessage('Pierce Lawn', 'Sam', 'https://g.page/x')).toBe(
      "Thanks for your business, Sam! If you have a minute, we'd really appreciate a quick review: https://g.page/x — Pierce Lawn",
    )
  })
})

describe('appointmentReminderMessage', () => {
  it('includes business, client, and the when clause', () => {
    expect(appointmentReminderMessage('Pierce Lawn', 'Sam', 'tomorrow')).toBe(
      "Hi Sam — This is Pierce Lawn. Friendly reminder: we're scheduled to be out tomorrow. Reply here if anything changed!",
    )
  })

  it('omits the business clause when blank', () => {
    expect(appointmentReminderMessage('', 'Sam', 'on Jul 20')).toBe(
      "Hi Sam — Friendly reminder: we're scheduled to be out on Jul 20. Reply here if anything changed!",
    )
  })
})
