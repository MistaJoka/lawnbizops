import { defineConfig } from 'vite'
import { configDefaults } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  // '/' locally and on a custom domain; '/LawnBizOps/' on GitHub Pages project URL
  base: process.env.VITE_BASE ?? '/',
  plugins: [
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
    },
  },
})
