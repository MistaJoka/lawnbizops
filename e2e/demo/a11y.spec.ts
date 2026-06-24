import { test, expect, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { AUTHED_ROUTES, DETAIL_ROUTES } from './authed-routes'

// Backend-free accessibility regression across EVERY authed screen. Gloved,
// one-handed field use makes labels, contrast, and roles real usability bugs —
// not just compliance — and the custom dark "tactical" theme makes contrast easy
// to regress. The existing e2e/a11y.spec.ts covers only login + board against a
// real backend; this scans the whole app in DEMO mode with no Supabase/Docker.
//
// Gate on the two worst tiers (critical/serious); a violation fails with the
// rule id + offending node count so it's actionable.
const BLOCKING = ['critical', 'serious']

async function scan(page: Page, context: string) {
  // Neutralize in-flight CSS animations/transitions so axe evaluates the settled
  // visual state, not a transient mid-fade frame — e.g. the sync toast's
  // entrance animation momentarily dips text opacity below the contrast floor.
  await page.addStyleTag({
    content:
      '*,*::before,*::after{animation-duration:0s!important;animation-delay:0s!important;transition-duration:0s!important;transition-delay:0s!important}',
  })
  const { violations } = await new AxeBuilder({ page }).analyze()
  const blocking = violations.filter((v) => BLOCKING.includes(v.impact ?? ''))
  const summary = blocking.map(
    (v) => `${v.id} (${v.impact}): ${v.nodes.length}× — ${v.help}`,
  )
  expect(blocking, `a11y on ${context}:\n${summary.join('\n')}`).toEqual([])
}

for (const { path, heading, text } of AUTHED_ROUTES) {
  test(`a11y ${path}`, async ({ page }) => {
    await page.goto(path)
    // Wait until the screen has actually painted before scanning.
    const marker = heading
      ? page.getByRole('heading', { name: heading }).first()
      : page.getByText(text!).first()
    await expect(marker).toBeVisible()
    await scan(page, path)
  })
}

for (const { path, label } of DETAIL_ROUTES) {
  test(`a11y ${label}`, async ({ page }) => {
    await page.goto(path)
    // Wait until the entity has rendered before scanning.
    await expect
      .poll(async () => (await page.locator('main').innerText()).trim().length)
      .toBeGreaterThan(20)
    await scan(page, `${label} (${path})`)
  })
}
