import { describe, expect, it } from 'vitest'
import {
  jobQuickActions,
  quoteQuickActions,
  arQuickActions,
  callOnly,
} from './cardActions'
import type { JobWithContext } from '@/features/jobs/hooks'
import type { EstimateListRow } from '@/features/estimates/hooks'
import type { InvoiceBalance } from '@/features/invoices/hooks'

const keys = (a: { key: string }[]) => a.map((x) => x.key)

const job = (phone: string | undefined, geocoded: boolean): JobWithContext =>
  ({
    property: {
      client: phone ? { phone } : null,
      lat: geocoded ? 26 : null,
      lng: geocoded ? -80 : null,
    },
  }) as JobWithContext

describe('card quick-action curation', () => {
  it('job: call when there is a phone, maps when geocoded', () => {
    expect(keys(jobQuickActions(job('555', true)))).toEqual(['call', 'maps'])
    expect(keys(jobQuickActions(job(undefined, true)))).toEqual(['maps'])
    expect(keys(jobQuickActions(job('555', false)))).toEqual(['call'])
  })

  it('quote: call/text need a phone; accept is always offered', () => {
    expect(
      keys(quoteQuickActions({ id: 'e', client: { phone: '555' } } as EstimateListRow)),
    ).toEqual(['call', 'text', 'accept'])
    expect(keys(quoteQuickActions({ id: 'e', client: null } as EstimateListRow))).toEqual(
      ['accept'],
    )
  })

  it('a/r: nudge needs a phone; mark-paid is always offered', () => {
    const inv = (phone?: string) =>
      ({
        invoice_id: 'i',
        balance_cents: 5000,
        number: 'INV-1',
        client: phone ? { name: 'Pat', phone } : null,
      }) as InvoiceBalance
    expect(keys(arQuickActions(inv('555')))).toEqual(['call', 'nudge', 'paid'])
    expect(keys(arQuickActions(inv(undefined)))).toEqual(['paid'])
  })

  it('paid: just call, and nothing without a phone', () => {
    expect(keys(callOnly('555'))).toEqual(['call'])
    expect(keys(callOnly(undefined))).toEqual([])
  })
})
