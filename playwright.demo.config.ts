import { defineConfig, devices } from '@playwright/test'

// Backend-free smoke suite. Drives the app in DEMO mode (`npm run dev:demo`,
// i.e. VITE_DEMO=1) against the in-memory fake backend in src/lib/demo.ts — NO
// Supabase, NO Docker, NO network egress. This is the one e2e config that runs
// anywhere (CI without a DB, a sandbox, a laptop offline), so it's the cheap
// guard for "does every authed screen still render?".
//
// The seeded fake provides a session + onboarded/access app_state, so tests can
// navigate straight to any authed route without logging in. Separate port from
// the real-backend config (5173) so both can coexist on one machine.
export default defineConfig({
  testDir: './e2e/demo',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:5174',
    headless: true,
    trace: 'on-first-retry',
  },
  // Mobile viewport + touch — this is a mobile-first PWA.
  projects: [{ name: 'mobile-chrome', use: { ...devices['Pixel 7'] } }],
  webServer: {
    command: 'npm run dev:demo -- --port 5174',
    url: 'http://localhost:5174',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
})
