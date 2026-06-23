import { test, expect } from '@playwright/test'
import { login, showBoard, lane } from './helpers'

// The crown-jewel regression: a job through the whole money loop AND back.
// Margaret Whitfield's hedge-trim is the only Margaret job in Scheduled (she has
// no recurring schedule), so it's uniquely trackable across lanes.
test('Start → Done → Invoice → Void restores the job to Done (reversibility)', async ({
  page,
}) => {
  await login(page)
  await showBoard(page)
  const CLIENT = 'Margaret Whitfield'

  // Scheduled → In progress
  await lane(page, /^scheduled$/i)
    .locator('.card-surface', { hasText: CLIENT })
    .getByRole('button', { name: /start/i })
    .click()
  await expect(
    lane(page, /in progress/i).locator('.card-surface', { hasText: CLIENT }),
  ).toBeVisible()

  // In progress → Done
  await lane(page, /in progress/i)
    .locator('.card-surface', { hasText: CLIENT })
    .getByRole('button', { name: /done/i })
    .click()
  const doneCard = lane(page, /^done$/i).locator('.card-surface', { hasText: CLIENT })
  await expect(doneCard).toBeVisible()

  // Done → Invoice (creates a draft invoice and navigates to it)
  await doneCard.getByRole('button', { name: /invoice/i }).click()
  await expect(page).toHaveURL(/\/invoices\//)
  await expect(page.getByText(/draft/i)).toBeVisible()

  // Void the invoice via the themed confirm dialog → the compensating inverse.
  // (window.confirm was replaced by an in-DOM ConfirmDialog, so drive the sheet
  // rather than a native dialog event.)
  await page.getByRole('button', { name: /void invoice/i }).click()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /void invoice/i })
    .click()
  await expect(page).toHaveURL(/\/money/)

  // Reversibility: the job is billable again, back in the Done lane
  await page.goto('/')
  await showBoard(page)
  await expect(
    lane(page, /^done$/i).locator('.card-surface', { hasText: CLIENT }),
  ).toBeVisible({ timeout: 15_000 })
})
