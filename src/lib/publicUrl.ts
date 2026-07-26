/**
 * Absolute URL to a public, token-keyed customer page (estimate approval,
 * quote request) — the links the operator hands to a customer.
 *
 * It MUST route through BASE_URL. The app is served from a GitHub Pages
 * sub-path (`/lawnbizops/`), so the old `${origin}/e/${token}` resolved to
 * the ROOT Pages site and returned GitHub's "Site not found" page: every
 * approval link and every quote-request link shared with a customer was dead
 * in production, silently, with no error either party could act on (CC-007).
 *
 * BASE_URL is '/' in dev and preview, so one expression is correct everywhere.
 */
export function publicUrl(path: string): string {
  const base = import.meta.env.BASE_URL // always ends in '/'
  return `${window.location.origin}${base}${path.replace(/^\/+/, '')}`
}
