// Keep the cold-case registry honest. .qa/registry.json promises that every
// past prod bug has a living guard (a regression test or CI script). This
// check fails the build if an entry is malformed or its guard file has been
// deleted/renamed — so a regression pin can't silently rot away while the
// registry still claims the bug is covered. Policy: docs/qa-playbook.md.
import { existsSync, readFileSync } from 'node:fs'

const PATH = '.qa/registry.json'
const errors = []

let reg
try {
  reg = JSON.parse(readFileSync(PATH, 'utf8'))
} catch (e) {
  console.error(`❌ ${PATH} missing or unparseable: ${e.message}`)
  process.exit(1)
}

const REQUIRED = ['id', 'title', 'severity', 'regression_test', 'status']
const SEVERITIES = new Set(['S1', 'S2', 'S3'])
const STATUSES = new Set(['closed', 'reopened', 'open'])
const ids = new Set()

for (const c of reg.cold_cases ?? []) {
  const tag = c.id ?? '<no id>'
  for (const k of REQUIRED) if (!c[k]) errors.push(`${tag}: missing field '${k}'`)
  if (ids.has(c.id)) errors.push(`${tag}: duplicate id`)
  ids.add(c.id)
  if (c.severity && !SEVERITIES.has(c.severity))
    errors.push(`${tag}: bad severity '${c.severity}'`)
  if (c.status && !STATUSES.has(c.status)) errors.push(`${tag}: bad status '${c.status}'`)
  // A reopened case is a returned prod bug — block until it's re-closed.
  if (c.status === 'reopened')
    errors.push(`${tag}: REOPENED cold case — fix before merging`)
  for (const ref of [c.regression_test, c.also_guarded_by].filter(Boolean)) {
    const file = ref.split('::')[0]
    if (!existsSync(file)) errors.push(`${tag}: guard '${file}' does not exist`)
  }
}

if ((reg.cold_cases ?? []).length === 0)
  errors.push('registry has no cold cases — wrong file?')

// The learnings ledger must exist and cross-reference every cold case: a bug
// without its structural lesson is half-processed (playbook → Learning loop).
const LEARNINGS = '.qa/learnings.md'
if (!existsSync(LEARNINGS)) {
  errors.push(`${LEARNINGS} missing — the learning loop is broken`)
} else {
  const ledger = readFileSync(LEARNINGS, 'utf8')
  for (const c of reg.cold_cases ?? []) {
    if (c.id && !ledger.includes(c.id))
      errors.push(`${c.id}: no learning entry references it in ${LEARNINGS}`)
  }
}

if (errors.length) {
  console.error('❌ cold-case registry check failed:')
  for (const e of errors) console.error(`   ${e}`)
  process.exit(1)
}
console.log(`✅ cold-case registry: ${reg.cold_cases.length} cases, every guard present`)
