import { describe, expect, it } from 'vitest'
import { lastSyncedAt, markSynced } from './syncClock'

describe('syncClock store', () => {
  it('starts null until a sync is recorded', () => {
    expect(lastSyncedAt()).toBeNull()
  })

  it('markSynced stores the supplied timestamp', () => {
    markSynced(1_700_000_000_000)
    expect(lastSyncedAt()).toBe(1_700_000_000_000)
  })

  it('markSynced without an arg records a current-ish epoch ms', () => {
    const before = Date.now()
    markSynced()
    expect(lastSyncedAt()).toBeGreaterThanOrEqual(before)
  })
})
