// Guard the customer-link contract. Both share flows built a customer URL as
// `${window.location.origin}/e/${token}` — dropping the GitHub Pages sub-path
// the app is deployed under, so every approval and quote-request link handed
// to a customer served GitHub's "Site not found" page. It was invisible in dev
// (BASE_URL is '/' there) and nothing failed loudly in prod: the operator saw
// a link get copied, the customer saw someone else's 404 (cold case CC-007).
//
// Rule: a public customer URL is built with publicUrl() from src/lib/publicUrl
// — never by concatenating location.origin with a route.
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = 'src'
const SKIP_FILE = /\.(test|spec)\.[jt]sx?$|publicUrl\.ts$/

// origin followed (in the same template literal) by a path segment.
const BARE_ORIGIN = /location\.origin\}[`'"]?\//

const offenders = []
function walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) {
      walk(path)
      continue
    }
    if (!/\.[jt]sx?$/.test(name) || SKIP_FILE.test(name)) continue
    readFileSync(path, 'utf8')
      .split('\n')
      .forEach((line, i) => {
        if (BARE_ORIGIN.test(line)) offenders.push(`${path}:${i + 1} — ${line.trim()}`)
      })
  }
}
walk(ROOT)

if (offenders.length) {
  console.error(
    'Customer URL built from location.origin — use publicUrl() so the deploy sub-path survives:',
  )
  for (const o of offenders) console.error('  ' + o)
  process.exit(1)
}
console.log('✅ public customer links all route through publicUrl()')
