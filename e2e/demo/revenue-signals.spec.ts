import { test, expect } from '@playwright/test'

// Two ways the app used to lose money quietly. Both were invisible to the
// render and a11y smokes, because in both cases the screen rendered *correctly
// formatted nothing* — and a passing render test can't tell "no signal" from
// "no problem".
//
//  1. Lateness never reached a list. agingBucket() existed but only the nudge
//     sheet called it, so an invoice 38 days past due drew the same grey "Sent"
//     chip as one issued yesterday.
//  2. A job priced at $0 fell through a `price_cents > 0 &&` guard on the board
//     card and both schedule rows — rendering a blank gap beside priced
//     siblings, and quietly missing from the lane total. It gets worked, then
//     never billed.

test('an overdue invoice says how late it is, in the list', async ({ page }) => {
  await page.goto('/money')

  // The demo seed carries INV-1040 (due Jun 18) and INV-1031 (due Apr 7) — both
  // long past due against the seeded "today".
  const row = page.getByRole('link', { name: /INV-1040/ })
  await expect(row).toBeVisible()
  await expect(
    row.getByText(/\d+d overdue/),
    'a past-due invoice row must state its lateness, not just its issue date',
  ).toBeVisible()

  // ...and an invoice that isn't late must NOT claim to be.
  const current = page.getByRole('link', { name: /INV-1042/ })
  await expect(current).toBeVisible()
  await expect(current.getByText(/overdue/)).toHaveCount(0)
})

test('the board names a job with no price instead of showing a gap', async ({ page }) => {
  await page.goto('/board')

  // Frank DiMarco's "Paver layout walk" is seeded at price_cents: 0.
  const card = page.locator('a', { hasText: 'Paver layout walk' }).first()
  await expect(card).toBeVisible()
  await expect(
    card.getByText(/no price/i),
    'an unpriced job must be called out — it is revenue about to be lost',
  ).toBeVisible()
})

test('the schedule flags the same unpriced job', async ({ page }) => {
  await page.goto('/schedule')
  const row = page.locator('a', { hasText: 'Paver layout walk' }).first()
  await expect(row).toBeVisible()
  await expect(row.getByText(/no price/i)).toBeVisible()
})
