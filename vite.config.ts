import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { defineConfig, type Plugin } from 'vite'
import { configDefaults } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import { VitePWA } from 'vite-plugin-pwa'

// Build-time provenance baked into the bundle (a static PWA has no git at
// runtime). Each git call is isolated so a thin checkout — e.g. a CI build from
// a tarball — degrades field-by-field to env-var fallbacks instead of failing.
function git(cmd: string): string {
  try {
    return execSync(`git ${cmd}`, { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim()
  } catch {
    return ''
  }
}

function buildInfo() {
  const version = JSON.parse(readFileSync('./package.json', 'utf8')).version as string
  return {
    version,
    sha:
      git('rev-parse --short HEAD') || process.env.GITHUB_SHA?.slice(0, 7) || 'unknown',
    branch:
      git('rev-parse --abbrev-ref HEAD') || process.env.GITHUB_REF_NAME || 'unknown',
    // Uncommitted changes at build time — meaningless in clean CI, handy locally.
    dirty: git('status --porcelain').length > 0,
    committedAt: git('log -1 --format=%cI') || new Date().toISOString(),
  }
}

// Expose build provenance as a virtual module. A virtual module resolves
// identically in dev and build (unlike `define`, which Vite 8 only substitutes
// at build time), so DevStripe sees the same data either way. Snapshotted once
// at config load — restart the dev server to pick up new commits.
function buildInfoPlugin(): Plugin {
  const id = 'virtual:build-info'
  const resolved = '\0' + id
  const code = `export default ${JSON.stringify(buildInfo())}`
  return {
    name: 'build-info',
    resolveId: (source) => (source === id ? resolved : null),
    load: (loadId) => (loadId === resolved ? code : null),
  }
}

export default defineConfig({
  // '/' locally and on a custom domain; '/LawnBizOps/' on GitHub Pages project URL
  base: process.env.VITE_BASE ?? '/',
  plugins: [
    buildInfoPlugin(),
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      // App shell only — Supabase data caching is TanStack Query's job, never the SW's.
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
      },
      manifest: {
        name: 'LawnBizOps',
        short_name: 'LawnBiz',
        description: 'Daily operations for the lawn business',
        // start_url/scope omitted — vite-plugin-pwa derives them from `base`.
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#111316',
        theme_color: '#111316',
        icons: [
          // relative srcs resolve against the manifest URL → correct under any base
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: { '@': '/src' },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    // Dummy Supabase env so the client module loads under a bare checkout/CI
    // (no .env.local). Unit tests never hit a real backend — they mock or
    // exercise pure logic — so the values only need to be present, not valid.
    env: {
      VITE_SUPABASE_URL: 'http://localhost:54321',
      VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test_placeholder',
    },
    // e2e/ holds Playwright specs (run via `npm run test:e2e`), not vitest.
    exclude: [...configDefaults.exclude, 'e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'text', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      // Exclude generated, dev-only, config, and pure-UI-wiring entry points.
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.test.tsx',
        'src/dev/**',
        'src/test/**',
        'src/main.tsx',
        'src/routeTree.gen.ts',
        'src/lib/database.types.ts',
      ],
      // Ratchet on the stable logic layer only. UI/route screens are covered by
      // e2e (invisible to v8 unit coverage), so a global gate would be noise —
      // these floors sit just under current src/lib coverage to block regressions
      // without churn. Raise them as feature-hook unit tests land.
      thresholds: {
        'src/lib/**': { statements: 70, branches: 65, functions: 60, lines: 70 },
      },
    },
  },
})
