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
