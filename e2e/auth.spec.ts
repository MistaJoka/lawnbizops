import { test, expect } from '@playwright/test'
import { login } from './helpers'

test('logs in with the demo business and lands on the board', async ({ page }) => {
  await login(page)
  // Default Today view is the Board → a lane is visible.
  await expect(page.getByRole('heading', { name: /^quote$/i })).toBeVisible()
})

test('rejects bad credentials', async ({ page }) => {
  await page.goto('/login')
  await page.getByPlaceholder('Email').fill('demo@lawnbizops.test')
  await page.getByPlaceholder('Password').fill('definitely-wrong-pass')
  await page.getByRole('button', { name: /^sign in$/i }).click()
  await expect(page.getByText(/invalid login/i)).toBeVisible()
  await expect(page).toHaveURL(/\/login/)
})
