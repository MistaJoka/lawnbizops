import { describe, expect, it } from 'vitest'
import { statusDetail, statusView } from './statusBar'

const at = (over: Partial<Parameters<typeof statusView>[0]> = {}) =>
  statusView({ updateReady: false, online: true, status: 'idle', pending: 0, ...over })

describe('statusView — top-bar status precedence', () => {
  it('a ready update outranks everything and is tappable', () => {
    const v = at({ updateReady: true, online: false, status: 'error', pending: 5 })
    expect(v.kind).toBe('update')
    expect(v.label).toBe('Update')
    expect(v.tappable).toBe(true)
  })

  it('a sync error is shown (and tappable to recovery) when no update', () => {
    const v = at({ status: 'error' })
    expect(v.kind).toBe('error')
    expect(v.tappable).toBe(true)
  })

  it('offline with a backlog shows the saved count', () => {
    const v = at({ online: false, status: 'offline', pending: 3 })
    expect(v.kind).toBe('offline')
    expect(v.label).toBe('Saved')
    expect(v.count).toBe(3)
  })

  it('offline with nothing queued reads as Offline, no count', () => {
    const v = at({ online: false, status: 'idle', pending: 0 })
    expect(v.kind).toBe('offline')
    expect(v.label).toBe('Offline')
    expect(v.count).toBeNull()
  })

  it('syncing shows the in-flight count', () => {
    const v = at({ status: 'syncing', pending: 2 })
    expect(v.kind).toBe('syncing')
    expect(v.count).toBe(2)
  })

  it('online and settled reads as Synced', () => {
    const v = at()
    expect(v.kind).toBe('synced')
    expect(v.label).toBe('Synced')
    expect(v.tappable).toBe(false)
  })
})

describe('statusView — showAge suffix flag', () => {
  it('shows age only for a settled synced state', () => {
    expect(at().showAge).toBe(true)
  })
  it('shows age for offline with no backlog', () => {
    expect(at({ online: false, status: 'idle', pending: 0 }).showAge).toBe(true)
  })
  it('hides age when a count is already shown (offline backlog / syncing)', () => {
    expect(at({ online: false, status: 'offline', pending: 3 }).showAge).toBe(false)
    expect(at({ status: 'syncing', pending: 2 }).showAge).toBe(false)
  })
  it('hides age for update and error states', () => {
    expect(at({ updateReady: true }).showAge).toBe(false)
    expect(at({ status: 'error' }).showAge).toBe(false)
  })
})

describe('statusDetail — popover rows', () => {
  const base = {
    view: statusView({ updateReady: false, online: true, status: 'idle', pending: 0 }),
    lastSyncedAt: null as number | null,
    pending: 0,
    failed: 0,
    oldest: null as number | null,
    now: Date.UTC(2026, 5, 24, 12, 0, 0),
  }

  it('always shows State and Last sync (Never when no record)', () => {
    const rows = statusDetail(base)
    expect(rows.map((r) => r.label)).toEqual(['State', 'Last sync'])
    expect(rows[0].value).toBe('Synced')
    expect(rows[1].value).toBe('Never')
  })

  it('formats Last sync as a relative age when known', () => {
    const rows = statusDetail({ ...base, lastSyncedAt: base.now - 2 * 60_000 })
    expect(rows.find((r) => r.label === 'Last sync')!.value).toBe('2m')
  })

  it('adds Pending and Oldest queued only when there is a backlog', () => {
    const rows = statusDetail({
      ...base,
      pending: 3,
      oldest: base.now - 5 * 60_000,
    })
    const labels = rows.map((r) => r.label)
    expect(labels).toContain('Pending')
    expect(labels).toContain('Oldest queued')
    expect(rows.find((r) => r.label === 'Pending')!.value).toBe('3')
    expect(rows.find((r) => r.label === 'Oldest queued')!.value).toBe('5m')
  })

  it('adds Failed only when there are failed ops', () => {
    expect(statusDetail(base).some((r) => r.label === 'Failed')).toBe(false)
    expect(statusDetail({ ...base, failed: 2 }).some((r) => r.label === 'Failed')).toBe(
      true,
    )
  })

  it('omits Oldest queued when the backlog has no timestamp', () => {
    const rows = statusDetail({ ...base, pending: 1, oldest: null })
    expect(rows.some((r) => r.label === 'Oldest queued')).toBe(false)
  })
})
