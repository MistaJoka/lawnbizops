import { test, expect, type Page, type ConsoleMessage } from '@playwright/test'

// Every param-free authed route. This is the manual "audit each route" punch
// list (docs/ship-readiness.md, P1 Frontend/UX) turned into automated, backend-
// free regression: each screen must render real seed data without crashing into
// the app error boundary and without throwing to the console.
//
// `heading` is the on-screen section header that proves the screen painted its
// content (not an empty shell). A few "new" routes are context-guards that, with
// no client/property selected, intentionally render a "pick X first" message
// instead of a form — those assert `text` instead. Either way the assertion
// documents the screen's expected state. Detail routes ($id params) are covered
// by click-through below so we don't hardcode brittle seed ids.
const ROUTES: Array<{ path: string; heading?: RegExp; text?: RegExp }> = [
  { path: '/', heading: /^today$/i },
  { path: '/dashboard', heading: /^dashboard$/i },
  { path: '/board', heading: /^quote$/i },
  { path: '/pipeline', heading: /pipeline/i },
  { path: '/schedule', heading: /schedule/i },
  { path: '/clients', heading: /clients/i },
  { path: '/clients/new', heading: /new client/i },
  { path: '/clients/import', heading: /import/i },
  { path: '/jobs/new', heading: /new job/i },
  { path: '/estimates/new', heading: /estimate/i },
  { path: '/invoices/new', heading: /invoice/i },
  { path: '/money', heading: /money/i },
  { path: '/money/reports', heading: /report/i },
  { path: '/expenses/new', heading: /expense/i },
  { path: '/inventory', heading: /inventory/i },
  { path: '/properties/new', text: /pick a client first/i }, // guard: needs a client
  { path: '/schedules/new', text: /pick a property first/i }, // guard: needs a property
  { path: '/tax', heading: /tax/i },
  { path: '/tax/mileage/new', heading: /log a trip/i },
  { path: '/tax/payees/new', heading: /payee|1099/i },
  { path: '/tools', heading: /tools/i },
  { path: '/tools/grade', heading: /grade/i },
  { path: '/tools/mulch', heading: /mulch/i },
  { path: '/settings', heading: /settings/i },
  { path: '/settings/profile', heading: /profile|business/i },
  { path: '/settings/services', heading: /service catalog/i },
  { path: '/settings/preferences', heading: /preferences/i },
  { path: '/settings/payments', heading: /payment/i },
  { path: '/settings/tax', heading: /tax/i },
  { path: '/settings/automations', heading: /automation/i },
  { path: '/settings/export', heading: /export/i },
  { path: '/settings/sync', heading: /sync/i },
]

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

for (const { path, heading, text } of ROUTES) {
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
