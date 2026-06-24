import { describe, expect, it, vi } from 'vitest'
import { applyUpdate, isUpdateReady, markUpdateReady } from './pwaUpdate'

describe('pwaUpdate store', () => {
  it('starts not-ready', () => {
    expect(isUpdateReady()).toBe(false)
  })

  it('markUpdateReady flips ready and applyUpdate runs the supplied reload', () => {
    const reload = vi.fn()
    markUpdateReady(reload)
    expect(isUpdateReady()).toBe(true)
    applyUpdate()
    expect(reload).toHaveBeenCalledTimes(1)
  })
})
