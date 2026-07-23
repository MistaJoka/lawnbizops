// Guard the migration ledger. Two feature branches once both claimed 0027 —
// the collision surfaced at merge time and forced a hand-renumber (0031), the
// kind of fix that silently corrupts a prod schema if missed (cold case CC-005
// in .qa/registry.json). Enforce the invariants a linear ledger depends on:
// every file is NNNN_name.sql, prefixes are unique, and the sequence is
// contiguous from 0001 (a gap means a migration vanished — history rewrite).
import { readdirSync } from 'node:fs'

const DIR = 'supabase/migrations'
const files = readdirSync(DIR)
  .filter((f) => f.endsWith('.sql'))
  .sort()
const errors = []

const NAME = /^(\d{4})_[a-z0-9_]+\.sql$/
const nums = []
for (const f of files) {
  const m = NAME.exec(f)
  if (!m) {
    errors.push(`bad name: ${f} (expected NNNN_snake_case.sql)`)
    continue
  }
  nums.push({ n: Number(m[1]), f })
}

const seen = new Map()
for (const { n, f } of nums) {
  if (seen.has(n))
    errors.push(`duplicate number ${String(n).padStart(4, '0')}: ${seen.get(n)} vs ${f}`)
  else seen.set(n, f)
}

for (let i = 0; i < nums.length; i++) {
  if (nums[i].n !== i + 1) {
    errors.push(
      `sequence break at ${nums[i].f}: expected ${String(i + 1).padStart(4, '0')} ` +
        `(migrations must be contiguous from 0001 — renumber before merging)`,
    )
    break
  }
}

if (errors.length) {
  console.error('❌ migration ledger check failed:')
  for (const e of errors) console.error(`   ${e}`)
  process.exit(1)
}
console.log(
  `✅ migration ledger: ${files.length} files, contiguous 0001–${String(nums.length).padStart(4, '0')}, no duplicates`,
)
