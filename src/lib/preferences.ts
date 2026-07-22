/** Device-local app preferences (not synced — stitch settings toggles). */

export interface AppPreferences {
  gpsTracking: boolean
  inventoryAlerts: boolean
  offlinePreferred: boolean
  pushNotifications: boolean
  /** Which Today layout to show: the pipeline board or the drive-order route. */
  todayView: 'board' | 'route'
  /** User hid the home-screen activation checklist. */
  activationDismissed: boolean
  /** ISO timestamp of the last "Needs attention" mark-seen — items newer than
   *  this count as unseen. Empty = never marked. */
  attentionSeenAt: string
}

const KEY = 'lawnbizops:prefs'

const DEFAULTS: AppPreferences = {
  gpsTracking: true,
  inventoryAlerts: true,
  offlinePreferred: false,
  pushNotifications: false,
  todayView: 'board',
  activationDismissed: false,
  attentionSeenAt: '',
}

export function loadPreferences(): AppPreferences {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...DEFAULTS }
    return { ...DEFAULTS, ...JSON.parse(raw) }
  } catch {
    return { ...DEFAULTS }
  }
}

export function savePreferences(patch: Partial<AppPreferences>): AppPreferences {
  const next = { ...loadPreferences(), ...patch }
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // Private-browsing / disabled-storage: setItem can throw
    // (SecurityError / QuotaExceededError). Degrade to in-memory only.
  }
  return next
}
