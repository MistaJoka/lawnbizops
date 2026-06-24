/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

// Virtual module supplied by buildInfoPlugin (see vite.config.ts). Snapshotted
// from git at config-load time; there is no git at runtime in a static PWA.
declare module 'virtual:build-info' {
  const info: {
    version: string
    sha: string
    branch: string
    dirty: boolean
    committedAt: string
  }
  export default info
}
