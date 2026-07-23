# QA Playbook

The quality system for this repo: what runs, when it runs, what blocks a merge,
and the discipline that keeps AI-assisted code from rotting into slop. This is
the policy document; the enforcement lives in CI (`.github/workflows/ci.yml`),
the cold-case registry (`.qa/registry.json`), and the guard scripts
(`scripts/check-migrations.mjs`, `scripts/qa-registry-check.mjs`).

## Philosophy

Strategy follows the **testing trophy**, not the classic pyramid: a wide static
foundation (types, lint, format), a modest band of unit tests on pure logic,
the **bulk of confidence from integration-level tests** (real Supabase stack,
real Playwright browser), and a thin cap of full-path e2e. Rationale: fewer
integration tests catch more real defects per test and survive refactors that
implementation-coupled unit tests don't.

Two hard lessons shape everything below:

- **Coverage measures execution, not verification.** An assertion that can't
  fail is decoration. Mutation testing (Stryker) is the check on the checkers —
  it has already caught 2 real no-op assertions here.
- **A test environment that differs from prod is a blind spot shaped exactly
  like your worst outage.** The basepath bug (CC-001) shipped because dev, e2e,
  and preview all ran at base `/` while prod ran at `/lawnbizops/`. Every
  environment-shaped gap needs a prod-shaped smoke.

## The layers — what runs when

| Layer            | What                                                        | Where         | Blocks merge |
| ---------------- | ----------------------------------------------------------- | ------------- | ------------ |
| Static           | eslint, prettier, `tsc -b`                                  | CI `check`    | yes          |
| Ledger guards    | migration numbering, cold-case registry integrity           | CI `check`    | yes          |
| Unit             | 46 files / 355+ vitest tests on pure logic + hooks          | CI `check`    | yes          |
| Coverage floor   | `src/lib` thresholds (see vite.config)                      | CI `check`    | yes          |
| Bundle budget    | gzipped eager/lazy JS budgets                               | CI `check`    | yes          |
| Data invariants  | conservation laws on any data (`invariants.sql`)            | CI `rls-test` | yes          |
| Tenant safety    | two-org RLS leak test (`rls_isolation.sql`)                 | CI `rls-test` | yes          |
| **Cold cases**   | **behavioral pins of past prod bugs (`cold_cases.sql`)**    | CI `rls-test` | yes          |
| Prod-shape smoke | `VITE_BASE=/lawnbizops/` build + route probe                | CI `e2e`      | yes          |
| E2E regression   | money loop, quick-add, auth, board toggle, offline outbox   | CI `e2e`      | yes          |
| Render smoke     | every authed route paints in demo mode, zero console errors | CI `e2e-demo` | yes          |
| A11y             | axe scan of every authed screen                             | e2e suite     | yes          |
| Mutation         | Stryker on scoped logic + money-path files, `break: 55`     | CI `mutation` | yes          |

Local gate before any push — one command, no remembering (L-007):
`npm run verify` (lint, format, types, tests, ledger guards, build, bundle).

## Severity — what the words mean

- **S1** — money computed or displayed wrong, cross-tenant data leak, crash on
  the daily-driver path (Today/board, invoice creation, payment), data loss,
  committed secret. An S1 anywhere blocks everything.
- **S2** — a non-critical feature broken or significantly wrong output.
- **S3** — cosmetic, minor, or dev-only.

S1 paths (`.qa/registry.json → s1_paths`): the outbox, invoices, estimates,
and migrations. Code on these paths gets the stricter bars and the most
skeptical review.

## Quality bars + the ratchet

Current floors: `src/lib` coverage thresholds in `vite.config.ts`; mutation
`break: 55` in `stryker.config.json`; bundle budgets in
`scripts/bundle-budget.mjs`.

**The ratchet rule: floors only move up.** When new tests land, raise the
floor to just under the new reality. Lowering any floor requires a written
rationale in the commit message — "the build was red" is not one. Never delete,
skip, or `xfail` a failing test to get green; a wrong test is fixed or replaced
in the same commit, with the reason stated.

## Regression policy — the cold-case discipline

Every bug that reached prod (or a user) follows the same loop, no exceptions:

1. **Reproduce first.** Write the failing test that pins the bug _before_ the
   fix — at the lowest layer that can express it (SQL behavioral pin in
   `supabase/tests/cold_cases.sql` for DB bugs, vitest for logic, Playwright
   for flow/env bugs). Watch it fail; that's the proof it guards anything.
2. **Fix**, watch it pass.
3. **File the cold case** in `.qa/registry.json`: id, root cause, guard path.
4. **The guard lives forever.** `qa-registry-check.mjs` fails CI if a guard
   file disappears; a reopened case (status `reopened`) blocks merge outright.

A reopened cold case is worse than a new bug — it means the guard lied. Treat
it as the loudest possible failure.

Change-scoped selection: full suites run in CI on every push (they're fast
enough); there is no sampling to rot. If runtime ever forces selection, select
by impact (changed files → touched paths), never by age.

## Learning loop — progressive, blameless, externally calibrated

The system learns from itself, or it repeats itself. `.qa/learnings.md` is the
ledger of structural lessons — the _patterns_ behind the bugs, kept separate
from the bugs themselves (cold cases). Blameless throughout: lessons name
systems and process conditions, never people or sessions.

1. **Read before you run.** Every QA run starts by reading the ledger; new
   findings are checked against known patterns first (a repeat of a known
   pattern is worse than a novel bug — it means the lesson didn't hold).
2. **Three artifacts per prod bug, one commit:** the failing-first regression
   test, the cold case (`.qa/registry.json`), and the learning entry (the
   pattern). A bug without its lesson is half-processed.
3. **External calibration.** Each QA run re-compares the ledger against
   current practice (fresh sources, not memory) and records the comparison
   date + any deltas at the bottom of the ledger. Practices drift; ours
   should drift with the evidence, not with fashion.
4. **CI keeps the ledger honest** — `qa-registry-check.mjs` verifies it exists
   and that every cold case has a learning cross-reference.

## Flakiness policy

A flaky test is a defect in the test, and it is never ignored, rerun-until-
green, or deleted:

- **Hermeticity is the default**: frozen clock (`vi.setSystemTime`) for
  anything date-relative (CC-006 was exactly this), no real network in unit
  tests, seeded randomness, order-independence.
- A test caught flaking gets quarantined _visibly_: entry in
  `.qa/registry.json → flaky_quarantine` with the suspected cause, fixed or
  deleted-with-rationale within days, not months.

## AI-slop review checklist

AI-assisted diffs get reviewed with extra suspicion for the known failure
modes. Reject on sight:

- **Swallowed errors** — `catch {}` or catch-and-log where the caller needed
  the failure. This repo's rule: errors surface to the UI (QueryError, toasts)
  or the outbox retry loop; silence is never a strategy.
- **Comments that lie or narrate** — comments explaining _what the next line
  does_ or _why the change is correct_. Comments state constraints the code
  can't (this file's headers are the house style).
- **Type escape hatches** — `any`, `as unknown as`, `@ts-ignore` to make an
  error go away. `tsc -b` is a gate precisely so types stay honest.
- **Dead code and speculative abstraction** — unused exports, helpers for one
  call site, config for futures nobody scheduled.
- **Complexity inflation** — a 40-line generic solution where 8 concrete lines
  read better. Match the codebase's idiom, density, and naming.
- **Hallucinated behavior** — imports/APIs that don't exist, or code that
  contradicts the iron rules (direct `supabase.from().insert` bypassing the
  outbox, float money, UTC dates).
- **Tautological or snapshot-of-bug tests** — tests asserting current output
  rather than intended behavior, tests that can't fail, tests that mirror the
  implementation. Every new test must have visibly failed at least once
  (TDD red, or a deliberate mutation check).
- **Architectural drift** — "does this respect decisions already made?" is a
  review question co-equal with "does it work?". The decisions live in
  CLAUDE.md; a diff that fights them is wrong even when it works.

## Sources

Grounding for the practices above (researched 2026-07-22):

- [Martin Fowler — On the Diverse and Fantastical Shapes of Testing](https://martinfowler.com/articles/2021-test-shapes.html)
- [Kent C. Dodds — The Testing Trophy and Testing Classifications](https://kentcdodds.com/blog/the-testing-trophy-and-testing-classifications)
- [web.dev — Pyramid or Crab? Find a testing strategy that fits](https://web.dev/articles/ta-strategies)
- [Google Testing Blog — Where do our flaky tests come from?](https://testing.googleblog.com/2017/04/where-do-our-flaky-tests-come-from.html)
- [Harness — Regression Testing in CI/CD](https://www.harness.io/blog/regression-testing-in-ci-cd-deliver-faster-without-the-fear)
- [Leapwork — Regression Testing: An In-Depth Guide](https://leapwork.com/blog/regression-testing/)
- [metacto — Establishing Code Review Standards for AI-Generated Code](https://www.metacto.com/blogs/establishing-code-review-standards-for-ai-generated-code)
- [The AI Corner — The AI code review checklist](https://www.the-ai-corner.com/p/ai-code-review-checklist-2026-failure-modes-prompts)
- [Mergify — Test Quarantine: Stop Flaky Tests From Blocking Merges](https://mergify.com/learn/test-quarantine)
