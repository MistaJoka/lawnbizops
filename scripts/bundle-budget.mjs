// Fail the build if the JS bundle grows past budget (gzipped — what a field
// phone on LTE actually downloads). react-pdf is lazy-loaded (only when
// generating an invoice/estimate PDF), so it's budgeted separately and excluded
// from the eager total. Run after `npm run build`.
import { readdirSync, readFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { join } from 'node:path'

const DIR = 'dist/assets'
const KB = 1024

// Gzipped KB budgets — set with headroom over the current build to catch
// regressions (a doubled dependency, an un-split chunk), not micro-growth.
const TOTAL_BUDGET_KB = 350
const PDF_BUDGET_KB = 560

let total = 0
let pdf = 0
for (const f of readdirSync(DIR).filter((f) => f.endsWith('.js'))) {
  const gz = gzipSync(readFileSync(join(DIR, f))).length / KB
  if (/react-pdf/.test(f)) pdf += gz
  else total += gz
}

const line = (label, kb, budget) =>
  `${kb > budget ? '❌' : '✅'} ${label}: ${kb.toFixed(1)} KB gzipped (budget ${budget})`

console.log(line('eager JS (excl. react-pdf)', total, TOTAL_BUDGET_KB))
console.log(line('react-pdf (lazy)', pdf, PDF_BUDGET_KB))

if (total > TOTAL_BUDGET_KB || pdf > PDF_BUDGET_KB) {
  console.error('\nBundle over budget — split a chunk, lazy-load, or trim a dep.')
  process.exit(1)
}
