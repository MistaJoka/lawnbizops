// Sub-path routing smoke test. Guards the class of bug that took the whole
// deployed app down: the router needs `basepath` to match routes under the
// GitHub Pages sub-path (/lawnbizops/). dev/e2e/preview all run at base '/', so
// only a prod-base build exercises this. Run AFTER `VITE_BASE=/lawnbizops/ npm
// run build`. No backend needed — with no session the app routes to /login, and
// rendering the login screen (not "Not Found") proves the router resolved.
import { chromium } from '@playwright/test'
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'

const BASE = '/lawnbizops/'
const DIST = 'dist'
const PORT = 4319
const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
}

const server = createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname)
  if (!path.startsWith(BASE)) {
    res.writeHead(404)
    res.end('out of scope')
    return
  }
  let rel = path.slice(BASE.length) || 'index.html'
  if (rel.endsWith('/')) rel += 'index.html'
  try {
    const body = await readFile(normalize(join(DIST, rel)))
    res.writeHead(200, {
      'content-type': MIME[extname(rel)] ?? 'application/octet-stream',
    })
    res.end(body)
  } catch {
    res.writeHead(404)
    res.end('not found')
  }
})
await new Promise((resolve) => server.listen(PORT, resolve))

const browser = await chromium.launch()
const page = await browser.newPage()
await page.goto(`http://localhost:${PORT}${BASE}`, { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)
const finalUrl = page.url()
const body = (await page.locator('body').innerText()).replace(/\n+/g, ' | ')
await browser.close()
server.close()

const routed = /sign in/i.test(body) && !/not found/i.test(body)
if (!routed) {
  console.error(`FAIL: app did not route at ${BASE}`)
  console.error(`  final url: ${finalUrl}`)
  console.error(`  body: ${body.slice(0, 200)}`)
  process.exit(1)
}
console.log(`PASS: app routes under ${BASE} (reached ${finalUrl}, login screen rendered)`)
