import { test, expect, type Page } from '@playwright/test'

// Guards the prefers-reduced-motion gate in src/index.css. The app's custom
// keyframes are gated, but inline Tailwind utilities (active:scale-*,
// transition-transform, the looping animate-pulse on the sync dot) rely on the
// global reduced-motion reset. This pins that reset so a future change can't
// silently let looping/movement animation back in for motion-sensitive users.

/** Probe computed timing of a throwaway element carrying the given classes. */
async function timings(page: Page, className: string) {
  return page.evaluate((cls) => {
    const el = document.createElement('div')
    el.className = cls
    document.body.appendChild(el)
    const cs = getComputedStyle(el)
    const out = {
      animation: cs.animationDuration,
      transition: cs.transitionDuration,
    }
    el.remove()
    return out
  }, className)
}

const secs = (v: string) => parseFloat(v) * (v.includes('ms') ? 0.001 : 1)

test('reduced-motion neutralizes utility animation + transition timing', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  const t = await timings(page, 'animate-pulse transition-transform')
  // Effectively off (the reset sets 0.01ms) rather than the normal 2s pulse /
  // 150ms transition.
  expect(secs(t.animation)).toBeLessThan(0.05)
  expect(secs(t.transition)).toBeLessThan(0.05)
})

test('motion is present without the reduce preference (positive control)', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/')
  const t = await timings(page, 'animate-pulse transition-transform')
  // Proves the utilities actually carry real timing — so the test above is
  // measuring the gate, not a class that never applied.
  expect(secs(t.animation)).toBeGreaterThan(0.5)
  expect(secs(t.transition)).toBeGreaterThan(0.05)
})
