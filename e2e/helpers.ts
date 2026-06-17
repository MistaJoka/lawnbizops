import { type Page, expect } from '@playwright/test'

/** Sign in as the seed demo business and land on the Today screen. */
export async function login(page: Page): Promise<void> {
  await page.goto('/login')
  await page.getByPlaceholder('Email').fill('demo@lawnbizops.test')
  await page.getByPlaceholder('Password').fill('demo1234')
  await page.getByRole('button', { name: /^sign in$/i }).click()
  await expect(page).toHaveURL('/')
  await expect(page.getByRole('heading', { name: /^today$/i })).toBeVisible()
}

/** Ensure the Today hub is showing the Board (not Route) view. */
export async function showBoard(page: Page): Promise<void> {
  await page.getByRole('button', { name: /^board$/i }).click()
  await expect(page.getByRole('heading', { name: /^quote$/i })).toBeVisible()
}

/** A board lane section, located by its heading. */
export function lane(page: Page, name: RegExp) {
  return page.locator('section').filter({ has: page.getByRole('heading', { name }) })
}
