/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
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
  },
})
