import { test, expect, type Page, type ConsoleMessage } from '@playwright/test'
import { AUTHED_ROUTES, DETAIL_ROUTES } from './authed-routes'

// Drives the app in DEMO mode and visits every param-free authed route — the
// manual "audit each route" punch list (docs/ship-readiness.md, P1 Frontend/UX)
// turned into automated, backend-free regression: each screen must render real
// seed data without crashing into the app error boundary and without throwing to
// the console. Route list + per-route markers live in ./authed-routes.

// Console errors that don't indicate a broken screen. React Router/Query and the
// PWA emit benign noise; the fake backend has no real assets to fetch.
const IGNORED_CONSOLE = [
  /favicon/i,
  /manifest/i,
  /service worker/i,
  /Failed to load resource/i, // demo serves no real images/icons
  /Download the React DevTools/i,
  /navigator\.vibrate/i, // haptics blocked headlessly (no user gesture) — not a render fault
  /chromestatus\.com/i,
]

/** Attach a console-error collector to a fresh page. */
function trackErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('console', (msg: ConsoleMessage) => {
    if (msg.type() !== 'error') return
    const text = msg.text()
    if (IGNORED_CONSOLE.some((re) => re.test(text))) return
    errors.push(text)
  })
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`))
  return errors
}

/** The app-level error boundary (src/components/AppErrorFallback.tsx). */
async function assertNotCrashed(page: Page): Promise<void> {
  await expect(
    page.getByRole('heading', { name: /can.?t reach the server/i }),
  ).toBeHidden()
}

for (const { path, heading, text } of AUTHED_ROUTES) {
  test(`renders ${path}`, async ({ page }) => {
    const errors = trackErrors(page)

    await page.goto(path)

    // The screen painted its expected content, not an empty shell or a crash.
    const marker = heading
      ? page.getByRole('heading', { name: heading }).first()
      : page.getByText(text!).first()
    await expect(marker).toBeVisible()
    await assertNotCrashed(page)

    expect(errors, `console errors on ${path}:\n${errors.join('\n')}`).toEqual([])
  })
}

for (const { path, label } of DETAIL_ROUTES) {
  test(`renders ${label}`, async ({ page }) => {
    const errors = trackErrors(page)

    await page.goto(path)

    // Data-dense detail/edit screens: assert the entity actually rendered
    // (non-trivial content) rather than a brittle per-entity heading, and that
    // it didn't crash or throw.
    await assertNotCrashed(page)
    await expect
      .poll(async () => (await page.locator('main').innerText()).trim().length, {
        message: `${label} (${path}) rendered empty`,
      })
      .toBeGreaterThan(20)

    expect(errors, `console errors on ${label} (${path}):\n${errors.join('\n')}`).toEqual(
      [],
    )
  })
}

test('client detail renders via click-through', async ({ page }) => {
  const errors = trackErrors(page)

  await page.goto('/clients')
  await expect(page.getByRole('heading', { name: /clients/i }).first()).toBeVisible()

  // First client row → detail. Proves the $clientId detail screen renders
  // without hardcoding a seed id.
  await page.getByRole('link').filter({ hasText: /\w/ }).first().click()
  await assertNotCrashed(page)
  await expect(page.locator('main')).not.toBeEmpty()

  expect(errors, `console errors:\n${errors.join('\n')}`).toEqual([])
})
