import { describe, expect, it } from 'vitest'
import { createDemoClient, demoModeEnabled } from './demo'

describe('demoModeEnabled', () => {
  it('is true only in a DEV build with VITE_DEMO=1', () => {
    expect(demoModeEnabled({ DEV: true, VITE_DEMO: '1' })).toBe(true)
  })
  it('never activates in a production build, even if the flag leaks', () => {
    expect(demoModeEnabled({ DEV: false, VITE_DEMO: '1' })).toBe(false)
    expect(demoModeEnabled({ DEV: true })).toBe(false)
    expect(demoModeEnabled({ DEV: true, VITE_DEMO: '0' })).toBe(false)
  })
})

describe('createDemoClient — no-backend fake', () => {
  it('returns a fake authenticated session so the auth guard passes', async () => {
    const c = createDemoClient()
    const { data } = await c.auth.getSession()
    expect(data.session?.user?.id).toBeTruthy()
  })

  it('app_state RPC reports onboarded + access so routing lands in the app', async () => {
    const c = createDemoClient()
    const { data } = await c.rpc('app_state')
    const row = Array.isArray(data) ? data[0] : data
    expect(row).toMatchObject({ onboarded: true, access: true })
  })

  it('returns seeded rows and honours eq() filters', async () => {
    const c = createDemoClient()
    const all = await c.from('clients').select('*')
    expect(all.error).toBeNull()
    expect(all.data ?? []).not.toHaveLength(0)

    const leads = await c.from('clients').select('*').eq('stage', 'lead')
    const rows = (leads.data ?? []) as { stage: string }[]
    expect(rows).not.toHaveLength(0)
    expect(rows.every((r) => r.stage === 'lead')).toBe(true)
  })

  it('single() returns one matching row', async () => {
    const c = createDemoClient()
    const lead = await c.from('clients').select('*').eq('stage', 'lead').single()
    expect(Array.isArray(lead.data)).toBe(false)
    expect((lead.data as unknown as { stage: string }).stage).toBe('lead')
  })

  it('jobs come pre-nested with property → client (the JOB_SELECT embed)', async () => {
    const c = createDemoClient()
    const { data } = await c.from('jobs').select('*, property:properties(*)')
    const rows = (data ?? []) as unknown as {
      property: { client: { name: string } | null } | null
    }[]
    expect(rows).not.toHaveLength(0)
    expect(rows[0].property).toBeTruthy()
    expect(rows[0].property?.client?.name).toBeTruthy()
  })

  it('writes (upsert / rpc flush) resolve without error', async () => {
    const c = createDemoClient()
    expect((await c.from('jobs').upsert({} as never)).error).toBeNull()
    expect((await c.rpc('materialize_jobs')).error).toBeNull()
  })
})

// dashboard_metrics was the last RPC still returning a frozen literal while
// every screen around it computed from the seed. The numbers had drifted apart,
// so one demo session showed three different truths: Money said "$1,420
// collected" and "$3,085 outstanding", Reports said "$2,380 income" for the
// same month, and Dashboard said "$5,030 outstanding". Nothing caught it —
// a render smoke sees a well-formatted number and calls it a pass.
//
// The guard is self-consistency: whatever the seed says, every RPC reading it
// must agree. That holds no matter how the seed changes later.
describe('demo dashboard_metrics agrees with the rest of the demo', () => {
  const monthStart = (today: string) => `${today.slice(0, 7)}-01`

  async function metrics(today: string) {
    const c = createDemoClient()
    const { data } = await c.rpc('dashboard_metrics', {
      p_today: today,
      p_month_start: monthStart(today),
      p_week_start: today,
      p_week_end: today,
    })
    return (Array.isArray(data) ? data[0] : data) as Record<string, number>
  }

  it('collected matches the P&L income for the same month', async () => {
    const c = createDemoClient()
    const today = new Date().toISOString().slice(0, 10)
    const { data } = await c.rpc('pnl_summary', {
      p_start: monthStart(today),
      p_end: today,
    })
    const pnl = (Array.isArray(data) ? data[0] : data) as { income_cents: number }
    expect((await metrics(today)).collected_cents).toBe(pnl.income_cents)
  })

  it('outstanding matches the open invoice balances Money adds up', async () => {
    const c = createDemoClient()
    const today = new Date().toISOString().slice(0, 10)
    const { data } = await c.from('invoice_balances').select('*')
    const rows = (data ?? []) as unknown as { status: string; balance_cents: number }[]
    const open = rows
      .filter(
        (r) =>
          r.balance_cents > 0 && ['draft', 'sent', 'partially_paid'].includes(r.status),
      )
      .reduce((s, r) => s + r.balance_cents, 0)
    expect((await metrics(today)).outstanding_cents).toBe(open)
  })

  it('client stage counts match the seeded clients', async () => {
    const c = createDemoClient()
    const { data } = await c.from('clients').select('*')
    const rows = (data ?? []) as unknown as {
      stage: string
      archived_at: string | null
    }[]
    const live = rows.filter((r) => !r.archived_at)
    const m = await metrics(new Date().toISOString().slice(0, 10))
    expect(m.leads).toBe(live.filter((r) => r.stage === 'lead').length)
    expect(m.quoted).toBe(live.filter((r) => r.stage === 'quoted').length)
    expect(m.active).toBe(live.filter((r) => r.stage === 'active').length)
    expect(m.dormant).toBe(live.filter((r) => r.stage === 'dormant').length)
  })
})
