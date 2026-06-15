/** Device-local app preferences (not synced — stitch settings toggles). */

export interface AppPreferences {
  gpsTracking: boolean
  inventoryAlerts: boolean
  offlinePreferred: boolean
  pushNotifications: boolean
  /** Which Today layout to show: the pipeline board or the drive-order route. */
  todayView: 'board' | 'route'
}

const KEY = 'lawnbizops:prefs'

const DEFAULTS: AppPreferences = {
  gpsTracking: true,
  inventoryAlerts: true,
  offlinePreferred: false,
  pushNotifications: false,
  todayView: 'board',
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
  localStorage.setItem(KEY, JSON.stringify(next))
  return next
}
