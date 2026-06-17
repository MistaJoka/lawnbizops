import { test, expect } from '@playwright/test'
import { login, showBoard, lane } from './helpers'

test('inline quick-add drops a new job into the Scheduled lane', async ({ page }) => {
  await login(page)
  await showBoard(page)
  const scheduled = lane(page, /^scheduled$/i)
  const before = await scheduled.locator('.card-surface').count()

  await scheduled.getByRole('button', { name: /\+\s*job/i }).click()
  await page
    .getByRole('button', { name: /add today/i })
    .first()
    .click()

  await expect(async () => {
    expect(await scheduled.locator('.card-surface').count()).toBe(before + 1)
  }).toPass({ timeout: 10_000 })
})
