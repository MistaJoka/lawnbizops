import { describe, expect, it } from 'vitest'
import { statusView } from './statusBar'

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
