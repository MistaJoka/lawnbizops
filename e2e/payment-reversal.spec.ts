import { test, expect } from '@playwright/test'
import { login } from './helpers'

// Reversible payments (Workstream A): a mis-keyed payment is corrected with an
// offsetting negative line — paid drops, balance is restored, and status reverts
// — WITHOUT voiding the invoice (it keeps its number + history).
//
// Seeded invoice ffffffff…04 is partially_paid: $4,500 total with one $2,250
// "Deposit (50%)" payment. Reversing the deposit must take it back to Sent.
test('Reverse a payment restores the balance and reverts status', async ({ page }) => {
  await login(page)
  await page.goto('/invoices/ffffffff-0000-4000-a000-000000000004')

  // Starting state: Partial, with the seeded deposit listed.
  await expect(page.getByText('Partial')).toBeVisible()
  await expect(page.getByText('Deposit (50%)')).toBeVisible()

  // Reverse the deposit (confirm dialog).
  page.once('dialog', (d) => void d.accept())
  await page.getByRole('button', { name: /^reverse$/i }).click()

  // An offsetting line is recorded, status reverts to Sent, and the now-spent
  // deposit no longer offers a Reverse action (no double-reversal).
  await expect(page.getByText(/Reversal of/i)).toBeVisible()
  await expect(page.getByText('Sent', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: /^reverse$/i })).toHaveCount(0)
})
