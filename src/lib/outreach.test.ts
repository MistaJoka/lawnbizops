import { describe, expect, it } from 'vitest'
import { mailtoHref, onMyWayMessage, reviewRequestMessage, smsHref } from './outreach'

describe('smsHref', () => {
  it('strips formatting from the number and url-encodes the body', () => {
    const href = smsHref('(305) 555-0100', 'On my way!')
    expect(href).toBe('sms:3055550100?body=On%20my%20way!')
  })

  it('keeps a leading + for international numbers', () => {
    expect(smsHref('+1 305 555 0100', 'hi')).toBe('sms:+13055550100?body=hi')
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
