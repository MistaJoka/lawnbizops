import { defineConfig, devices } from '@playwright/test'

// E2E regression suite. Drives the real app (vite dev server) against the LOCAL
// Supabase stack + seed. Serial on a single worker because all tests share one
// database — determinism over speed. global-setup re-seeds for a known state.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  timeout: 30_000,
  globalSetup: './e2e/global-setup.ts',
  use: {
    baseURL: 'http://localhost:5173',
    headless: true,
    trace: 'on-first-retry',
  },
  // Mobile viewport + touch — this is a mobile-first PWA.
  projects: [{ name: 'mobile-chrome', use: { ...devices['Pixel 7'] } }],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
})
