import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { login, showBoard } from './helpers'

// Accessibility scans on the key screens. Gloved, one-handed field use makes
// labels, contrast, and roles real usability bugs — not just compliance. We gate
// on the two worst tiers (critical/serious); a violation fails with the rule id
// + the offending node so it's actionable.
const BLOCKING = ['critical', 'serious']

async function scan(page: import('@playwright/test').Page, context: string) {
  const { violations } = await new AxeBuilder({ page }).analyze()
  const blocking = violations.filter((v) => BLOCKING.includes(v.impact ?? ''))
  const summary = blocking.map(
    (v) => `${v.id} (${v.impact}): ${v.nodes.length}× — ${v.help}`,
  )
  expect(blocking, `a11y on ${context}:\n${summary.join('\n')}`).toEqual([])
}

test('login screen has no critical/serious a11y violations', async ({ page }) => {
  await page.goto('/login')
  await page.getByRole('button', { name: /^sign in$/i }).waitFor()
  await scan(page, 'login')
})

test('board has no critical/serious a11y violations', async ({ page }) => {
  await login(page)
  await showBoard(page)
  await scan(page, 'board')
})
