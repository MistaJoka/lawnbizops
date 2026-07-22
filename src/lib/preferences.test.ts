import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { loadPreferences, savePreferences } from './preferences'

const KEY = 'lawnbizops:prefs'

// This harness injects a non-functional node localStorage that shadows jsdom's,
// so stub a working in-memory Storage for the module under test to read/write.
function memStorage(): Storage {
  let store: Record<string, string> = {}
  return {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => {
      store[k] = String(v)
    },
    removeItem: (k) => {
      delete store[k]
    },
    clear: () => {
      store = {}
    },
    key: (i) => Object.keys(store)[i] ?? null,
    get length() {
      return Object.keys(store).length
    },
  }
}

const DEFAULTS = {
  gpsTracking: true,
  inventoryAlerts: true,
  offlinePreferred: false,
  pushNotifications: false,
  todayView: 'board',
  activationDismissed: false,
  attentionSeenAt: '',
} as const

beforeEach(() => vi.stubGlobal('localStorage', memStorage()))
afterEach(() => vi.unstubAllGlobals())

describe('loadPreferences', () => {
  it('returns the defaults when nothing is stored', () => {
    expect(loadPreferences()).toEqual(DEFAULTS)
  })

  it('overlays stored values onto the defaults (forward-compatible merge)', () => {
    localStorage.setItem(KEY, JSON.stringify({ todayView: 'route' }))

    const prefs = loadPreferences()
    expect(prefs.todayView).toBe('route')
    expect(prefs.gpsTracking).toBe(true) // unmentioned key falls back to default
  })

  it('falls back to defaults when the stored JSON is corrupt', () => {
    localStorage.setItem(KEY, 'not json{')
    expect(loadPreferences()).toEqual(DEFAULTS)
  })

  it('returns a fresh object that cannot mutate the shared defaults', () => {
    const a = loadPreferences()
    a.gpsTracking = false
    expect(loadPreferences().gpsTracking).toBe(true)
  })
})

describe('savePreferences', () => {
  it('persists the patch merged over current prefs and returns the result', () => {
    const saved = savePreferences({ pushNotifications: true })

    expect(saved.pushNotifications).toBe(true)
    expect(loadPreferences().pushNotifications).toBe(true)
  })

  it('merges successive patches without dropping earlier changes', () => {
    savePreferences({ pushNotifications: true })
    savePreferences({ todayView: 'route' })

    const prefs = loadPreferences()
    expect(prefs.pushNotifications).toBe(true) // earlier change survives
    expect(prefs.todayView).toBe('route')
  })

  it('returns merged prefs without throwing when setItem fails (e.g. private mode)', () => {
    // Private-browsing / disabled-storage: setItem throws SecurityError/QuotaExceededError.
    const throwing = memStorage()
    throwing.setItem = () => {
      throw new DOMException('write blocked', 'SecurityError')
    }
    vi.stubGlobal('localStorage', throwing)

    let saved: ReturnType<typeof savePreferences> | undefined
    expect(() => {
      saved = savePreferences({ pushNotifications: true })
    }).not.toThrow()
    expect(saved?.pushNotifications).toBe(true) // in-memory state still updates
  })
})
