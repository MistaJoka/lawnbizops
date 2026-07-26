import { test, expect, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

// The two PUBLIC, token-keyed pages — the only screens a paying customer ever
// sees, and both revenue entry points:
//   /quote/:token  a stranger asks for work  → a lead
//   /e/:token      a customer accepts a quote → the job
//
// Neither had a single test until now, which is part of why CC-007 survived to
// production: every generated customer link dropped the Pages sub-path and
// resolved to a "Site not found" page. The link *construction* is pinned by
// publicUrl's unit tests and scripts/check-public-links.mjs; what was missing —
// and what this file adds — is proof the pages themselves render and can
// actually be acted on. A revenue entry point with no coverage is a silent
// outage waiting for a customer to discover it.
//
// Any token works in demo: the fake backend answers estimate_by_token /
// intake_business_name from the seed regardless of the value.
const TOKEN = 'demo-token'

async function scanA11y(page: Page, context: string) {
  // Same neutralizers as the authed a11y scan: settle animations, and hide the
  // dev-only panel that would otherwise trip target-size on something that
  // never ships.
  await page.addStyleTag({
    content:
      '*,*::before,*::after{animation-duration:0s!important;animation-delay:0s!important;transition-duration:0s!important;transition-delay:0s!important}' +
      '[data-dev-panel]{display:none!important}',
  })
  const { violations } = await new AxeBuilder({ page })
    .options({ rules: { 'target-size': { enabled: true } } })
    .analyze()
  const blocking = violations.filter((v) =>
    ['critical', 'serious'].includes(v.impact ?? ''),
  )
  expect(
    blocking,
    `a11y on ${context}:\n${blocking.map((v) => `${v.id}: ${v.help}`).join('\n')}`,
  ).toEqual([])
}

test.describe('public quote request (/quote/:token)', () => {
  test('leads with the business, and states what it needs before it will send', async ({
    page,
  }) => {
    await page.goto(`/quote/${TOKEN}`)

    // Letterhead: the landscaper's name is the masthead — this page is their
    // document, not the app's.
    await expect(page.getByText(/apex lawn/i).first()).toBeVisible()
    await expect(page.getByText(/quote request/i).first()).toBeVisible()

    const submit = page.getByRole('button', { name: /request my quote/i })
    await expect(submit).toBeVisible()
    // A stranger with nothing filled in cannot submit an unusable lead.
    await expect(submit).toBeDisabled()

    // Name alone is still unreachable — the business needs a way to reply.
    await page.getByLabel(/your name/i).fill('Jordan Smith')
    await expect(submit).toBeDisabled()

    // Name + one contact method is enough.
    await page.getByLabel(/phone/i).fill('(305) 555-0100')
    await expect(submit).toBeEnabled()
  })

  test('a submitted request confirms by name instead of going quiet', async ({
    page,
  }) => {
    await page.goto(`/quote/${TOKEN}`)
    await page.getByLabel(/your name/i).fill('Jordan Smith')
    await page.getByLabel(/phone/i).fill('(305) 555-0100')
    await page.getByRole('button', { name: /request my quote/i }).click()

    // The customer is told it landed, by name, and who has it.
    await expect(page.getByText(/request sent/i)).toBeVisible()
    await expect(page.getByText(/jordan/i)).toBeVisible()
  })

  test('a11y', async ({ page }) => {
    await page.goto(`/quote/${TOKEN}`)
    await expect(page.getByText(/quote request/i).first()).toBeVisible()
    await scanA11y(page, '/quote/:token')
  })
})

test.describe('estimate approval (/e/:token)', () => {
  test('reads as a document and offers the decision', async ({ page }) => {
    await page.goto(`/e/${TOKEN}`)

    await expect(page.getByText(/apex lawn/i).first()).toBeVisible()
    // Document identity + who it was prepared for — both come with the bundle.
    await expect(page.getByText(/estimate est-/i).first()).toBeVisible()
    await expect(page.getByText(/prepared for/i)).toBeVisible()

    // The money has to be legible, and the decision reachable.
    await expect(page.getByText(/total/i).first()).toBeVisible()
    await expect(page.getByText(/\$[\d,]+\.\d{2}/).first()).toBeVisible()
    await expect(page.getByRole('button', { name: /approve/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /^decline$/i })).toBeVisible()
  })

  test('approving tells the customer what happens next', async ({ page }) => {
    await page.goto(`/e/${TOKEN}`)
    await page.getByRole('button', { name: /approve/i }).click()

    // Not just "done" — who follows up, and for what.
    await expect(page.getByText(/approved/i)).toBeVisible()
    await expect(page.getByText(/schedule/i)).toBeVisible()
  })

  test('declining asks why before it commits', async ({ page }) => {
    await page.goto(`/e/${TOKEN}`)
    await page.getByRole('button', { name: /^decline$/i }).click()

    // First tap reveals the optional reason — the business learns why it lost
    // the work — and only the second tap commits.
    await expect(page.getByLabel(/reason for declining/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /confirm decline/i })).toBeVisible()
  })

  test('a11y', async ({ page }) => {
    await page.goto(`/e/${TOKEN}`)
    await expect(page.getByText(/prepared for/i)).toBeVisible()
    await scanA11y(page, '/e/:token')
  })
})
