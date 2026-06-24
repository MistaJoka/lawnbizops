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
  // (1) Neutralize in-flight CSS animations/transitions so axe evaluates the
  // settled visual state, not a transient mid-fade frame — e.g. the sync toast's
  // entrance animation momentarily dips text opacity below the contrast floor.
  // (2) Hide the dev-only DevPanel (never ships to prod) so it can't obscure real
  // tap targets — without this it overlaps the Today tab and trips target-size.
  await page.addStyleTag({
    content:
      '*,*::before,*::after{animation-duration:0s!important;animation-delay:0s!important;transition-duration:0s!important;transition-delay:0s!important}' +
      '[data-dev-panel]{display:none!important}',
  })
  const { violations } = await new AxeBuilder({ page })
    // Enable WCAG 2.2 target-size on top of the defaults — it's the automated
    // check for this app's "big glove-friendly tap targets" requirement, and
    // axe leaves it off by default.
    .options({ rules: { 'target-size': { enabled: true } } })
    .analyze()
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
