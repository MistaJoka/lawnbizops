// Guard the icon system. The UI once mixed three icon languages — hand-drawn
// SVGs, unicode glyphs, and emoji — and emoji render per-vendor: the grayscale
// phone emoji on the primary CALL button read as a *disabled* control on
// Samsung. Icons now come exclusively from lucide-react; emoji must not creep
// back into rendered UI code.
//
// Scope: src/**/*.{ts,tsx} excluding tests, src/dev/ (dev-only tooling), and
// content that never renders in the app chrome. Comments and console strings
// are stripped before scanning so prose stays free.
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = 'src'
const SKIP_DIRS = new Set(['dev'])
// DevStripe is the operator provenance bar; its "✱ dirty build" marker is a
// deliberate mono-text glyph, not an icon.
const SKIP_FILE = /\.(test|spec)\.[jt]sx?$|DevStripe\.tsx$/

// Pictographic emoji + legacy symbol blocks that were abused as icons
// (✓ ✕ ▶ ⋯ ☐ ⚠ 🔔 …). Deliberately NOT matched: typographic arrows (← → ‹ ›),
// middot, and dashes — those are prose affordances, not icons.
const EMOJI =
  /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{2300}-\u{23FF}\u{21BB}\u{22EF}\u{25A0}-\u{25FF}\u{2713}\u{2714}\u{2715}\u{2717}]/u

// Keep the guard honest without parsing TS: drop line comments, block
// comments, and console.* lines before scanning.
function stripNonUi(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map((line) => {
      const noComment = line.replace(/\/\/.*$/, '')
      return /console\.(log|warn|error|info|debug)/.test(noComment) ? '' : noComment
    })
}

const offenders = []
function walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) {
      if (!SKIP_DIRS.has(name)) walk(path)
      continue
    }
    if (!/\.[jt]sx?$/.test(name) || SKIP_FILE.test(name)) continue
    const lines = stripNonUi(readFileSync(path, 'utf8'))
    lines.forEach((line, i) => {
      const m = EMOJI.exec(line)
      if (m) offenders.push(`${path}:${i + 1} contains "${m[0]}"`)
    })
  }
}
walk(ROOT)

if (offenders.length) {
  console.error('Emoji/glyph icons found in UI code (use lucide-react):')
  for (const o of offenders) console.error('  ' + o)
  process.exit(1)
}
console.log('✅ no emoji/glyph icons in src UI code')
