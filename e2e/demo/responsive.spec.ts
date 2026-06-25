import { test, expect } from '@playwright/test'
import { AUTHED_ROUTES, DETAIL_ROUTES } from './authed-routes'

// No-horizontal-overflow guard at the narrowest common phone width (320px).
// The visual-polish pass fixed two real overflow bugs here (the tab bar clipped
// "SETTINGS", the Today route card ran off the edge); this pins every authed
// screen so a future too-wide element (un-truncated text, a fixed width, a wide
// grid) fails CI instead of silently breaking alignment on small devices.
const ALL = [...AUTHED_ROUTES.map((r) => r.path), ...DETAIL_ROUTES.map((r) => r.path)]

test.describe('no horizontal overflow at 320px', () => {
  test.use({ viewport: { width: 320, height: 720 } })

  for (const path of ALL) {
    test(`fits ${path}`, async ({ page }) => {
      await page.goto(path)
      // Wait until the screen has painted before measuring (.first() so a stray
      // duplicate landmark can't strict-violate — overflow is what we assert).
      await expect
        .poll(async () => (await page.locator('main').first().innerText()).trim().length)
        .toBeGreaterThan(0)
      // The document must not scroll horizontally (1px tolerance for rounding).
      const overflow = await page.evaluate(() => {
        const d = document.documentElement
        return d.scrollWidth - d.clientWidth
      })
      expect(
        overflow,
        `${path} overflows horizontally by ${overflow}px at 320`,
      ).toBeLessThanOrEqual(1)
    })
  }
})
