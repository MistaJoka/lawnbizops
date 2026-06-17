import { test, expect } from '@playwright/test'
import { login, showBoard } from './helpers'

test('toggles Today between Board and Route', async ({ page }) => {
  await login(page)
  await showBoard(page)
  await expect(page.getByRole('heading', { name: /^quote$/i })).toBeVisible()

  await page.getByRole('button', { name: /^route$/i }).click()
  await expect(page.getByRole('link', { name: /open route in maps/i })).toBeVisible()

  await page.getByRole('button', { name: /^board$/i }).click()
  await expect(page.getByRole('heading', { name: /^scheduled$/i })).toBeVisible()
})
