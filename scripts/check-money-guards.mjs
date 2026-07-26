// Guard the guards. Every handler that performs a money write must refuse a
// re-entrant call, because a double-tap on a laggy connection otherwise bills
// the customer twice. Estimate→invoice has a database backstop (the unique
// index on invoices.estimate_id, migration 0035 / cold case CC-004) — a
// job-built invoice has NONE, so the client-side guard IS the protection.
//
// Structural lint rather than a unit test: it walks the whole tree, so a NEW
// unguarded money handler fails CI the day it lands, without anyone
// remembering to add a case. Same spirit as check-migrations.mjs.
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const MONEY_WRITES =
  /(createInvoiceFromJobs|convertToInvoice|recordPayment|createEstimate|createDepositInvoice|batchInvoiceUnbilled|reversePayment)\(/

// An in-flight flag checked before the write, or a computed `canX` that
// includes one (the pattern the create forms use).
const GUARD =
  /if\s*\([^)]*\b(saving|busy|converting|invoicing|creating|reversing|batching|working)\b[^)]*\)\s*return|if\s*\(!can[A-Z]\w*\)\s*return/

function tsxFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) return tsxFiles(p)
    return /\.tsx$/.test(name) && !/\.test\./.test(name) ? [p] : []
  })
}

const offenders = []
for (const file of tsxFiles('src')) {
  const src = readFileSync(file, 'utf8')
  for (const [, name, body] of src.matchAll(
    /async function (\w+)\([^)]*\)\s*{([\s\S]*?)\n  }/g,
  )) {
    if (MONEY_WRITES.test(body) && !GUARD.test(body)) {
      offenders.push(`${file} → ${name}()`)
    }
  }
}

if (offenders.length) {
  console.error('❌ money write with no double-submit guard:')
  for (const o of offenders) console.error(`   ${o}`)
  console.error('\nAdd an in-flight flag checked before the write (see PaymentSheet).')
  process.exit(1)
}
console.log('✅ money writes: every handler guards against double-submit')
