import { test, expect } from '@playwright/test'
import { login, showBoard, lane } from './helpers'

// Integration test for the offline write spine: a mutation made OFFLINE must
// update optimistically, queue in the outbox, and then actually persist to the
// server once we're back online. Patricia has no recurring schedule, so her one
// Scheduled job is uniquely trackable (and untouched by the money-loop test).
test('an offline write is queued and drains to the server when back online', async ({
  page,
  context,
}) => {
  await login(page)
  await showBoard(page)
  const CLIENT = 'Patricia Nguyen'

  // Go offline, then Start the job — optimistic UI + outbox enqueue, no network.
  await context.setOffline(true)
  await lane(page, /^scheduled$/i)
    .locator('.card-surface', { hasText: CLIENT })
    .getByRole('button', { name: /start/i })
    .click()
  await expect(
    lane(page, /in progress/i).locator('.card-surface', { hasText: CLIENT }),
  ).toBeVisible()

  // Back online → the 'online' event drains the outbox to Supabase.
  await context.setOffline(false)
  await page.waitForTimeout(1500)

  // Hard reload bypasses the optimistic cache: if the row truly persisted, a
  // fresh fetch from the server still shows the job In progress.
  await page.goto('/')
  await showBoard(page)
  await expect(
    lane(page, /in progress/i).locator('.card-surface', { hasText: CLIENT }),
  ).toBeVisible({ timeout: 15_000 })
})
