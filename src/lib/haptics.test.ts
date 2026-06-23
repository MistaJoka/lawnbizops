import { afterEach, describe, expect, it, vi } from 'vitest'
import { haptics } from './haptics'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('haptics', () => {
  it('fires the matching vibration pattern for each kind', () => {
    const vibrate = vi.fn()
    vi.stubGlobal('navigator', { vibrate })

    haptics.tap()
    haptics.success()
    haptics.warning()
    haptics.error()

    expect(vibrate).toHaveBeenCalledTimes(4)
    expect(vibrate).toHaveBeenNthCalledWith(1, 10)
    expect(vibrate).toHaveBeenNthCalledWith(2, [12, 40, 12])
    expect(vibrate).toHaveBeenNthCalledWith(3, [20, 60, 20])
    expect(vibrate).toHaveBeenNthCalledWith(4, [30, 50, 30, 50, 30])
  })

  it('no-ops where the Vibration API is unsupported', () => {
    vi.stubGlobal('navigator', {})
    expect(() => haptics.tap()).not.toThrow()
  })

  it('swallows errors thrown by vibrate (e.g. no user gesture yet)', () => {
    vi.stubGlobal('navigator', {
      vibrate: () => {
        throw new Error('gesture required')
      },
    })
    expect(() => haptics.error()).not.toThrow()
  })
})
