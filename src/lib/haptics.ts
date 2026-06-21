/**
 * Tactile confirmation for the field. The S24/S26 Ultra (Chrome) supports the
 * Vibration API; iOS Safari does not, so every call no-ops where unsupported.
 *
 * Patterns are deliberately short — this is a work tool, not a game. A tap is a
 * single tick; success is a light double; warning/error escalate so a glove can
 * feel the difference without looking at the screen.
 */

type Pattern = number | number[]

const PATTERNS = {
  tap: 10,
  success: [12, 40, 12],
  warning: [20, 60, 20],
  error: [30, 50, 30, 50, 30],
} satisfies Record<string, Pattern>

export type HapticKind = keyof typeof PATTERNS

const canVibrate = (): boolean =>
  typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function'

function fire(kind: HapticKind): void {
  if (!canVibrate()) return
  try {
    navigator.vibrate(PATTERNS[kind])
  } catch {
    // Some browsers throw if the page hasn't had a user gesture yet — ignore.
  }
}

export const haptics = {
  tap: () => fire('tap'),
  success: () => fire('success'),
  warning: () => fire('warning'),
  error: () => fire('error'),
}
