# QA Learnings Ledger

Progressive, blameless memory of what this codebase has taught us. Cold cases
(`registry.json`) remember _bugs_; this ledger remembers the _patterns behind
them_ so the same class of mistake is never made twice. Focus on systems and
process, never people.

**Protocol** (enforced via `docs/qa-playbook.md` → Learning loop):

1. Every QA run READS this ledger first — findings get checked against known
   patterns before being treated as new.
2. Every prod bug lands THREE artifacts in one commit: the failing-first
   regression test, the cold case, and a learning entry here (the pattern).
3. Each QA run appends new structural learnings and re-compares existing ones
   against current external practice; deltas are recorded and dated.

Last external comparison: **2026-07-23** (sources at bottom).

---

## L-001 — Test the prod shape, not the dev shape

- **What happened (2026-06-20, CC-001):** every route on prod rendered "Not
  Found" — the router had no basepath. Dev, e2e, and preview all ran at base
  `/`; only prod ran at `/lawnbizops/`. The bug was latent since first deploy.
- **Structural lesson:** an environment difference between test and prod is a
  blind spot shaped exactly like your worst outage. Green tests in the wrong
  shape prove nothing about the real shape.
- **Guard adopted:** CI builds at `VITE_BASE=/lawnbizops/` and probes a route
  (`scripts/smoke-basepath.mjs`).
- **Modern practice:** dev/prod parity (12-factor); web.dev's guidance to fit
  the strategy to how the app actually deploys.

## L-002 — Schema refactors must sweep every dependent

- **What happened (2026-06-14, CC-002):** re-keying business_settings from
  user_id to org_id left the invoice/estimate numbering triggers still writing
  `on conflict (user_id)` — invoice creation broke in prod.
- **Structural lesson:** a column re-key isn't done when the table migrates;
  it's done when every trigger, function, view, and index that references the
  old key is swept. The database doesn't warn you.
- **Guard adopted:** cold-case behavioral pin (`supabase/tests/cold_cases.sql`);
  migration review habit: grep functions/triggers for the re-keyed column.
- **Modern practice:** expand–contract (parallel change) migrations — never
  drop the old shape until nothing references it.

## L-003 — Reversibility breaks forward-only assumptions

- **What happened (2026-06-23, CC-003):** adding payment reversal exposed that
  apply_payment's status recompute ended in `else status` — correct while
  payments only went forward, wrong the moment they could go back. A fully
  reversed invoice stayed 'paid' forever.
- **Structural lesson:** when an operation gains an inverse, every state
  recompute derived from it must be re-derived from scratch. "It worked before"
  is exactly the trap.
- **Guard adopted:** cold-case pin of the full round trip (pay → paid →
  reverse → sent); invariants.sql conservation law on reversal lines.
- **Modern practice:** append-only ledger accounting — corrections are new
  entries, and status is always a pure function of the ledger.

## L-004 — Client-side guards need database backstops

- **What happened (2026-07-19, CC-004):** the UI disabled "Convert" when an
  estimate already had an invoice — but two offline devices, or a retry racing
  the cache, could both convert and double-bill the client.
- **Structural lesson:** any uniqueness or integrity rule enforced only in the
  client is enforced only per-device. Offline-first apps widen every race
  window; the constraint must live where the truth lives.
- **Guard adopted:** partial unique index on invoices.estimate_id (0035) +
  cold-case pin that the second insert is rejected.
- **Modern practice:** constraint-first design — the database is the last line
  of defense and the only one that holds under concurrency.

## L-005 — Ledgers need mechanical guards, not vigilance

- **What happened (2026-06-23, CC-005):** two branches both claimed migration
  number 0027; the collision surfaced at merge and forced a hand-renumber.
- **Structural lesson:** anything that must stay unique/ordered across
  parallel work (migration numbers, port assignments, enum values) will
  eventually collide if only human attention guards it.
- **Guard adopted:** `scripts/check-migrations.mjs` in CI — unique, contiguous,
  well-named, every push.
- **Modern practice:** lint the ledger — cheap structural invariants belong in
  CI, not code review.

## L-006 — Hermeticity or flakiness, there is no third option

- **What happened (2026-06-22, CC-006):** estimate-expiry chip tests asserted
  against the real clock; they passed or failed depending on the day the suite
  ran.
- **Structural lesson:** every hidden input (clock, network, order, randomness)
  is a future flake. Flaky tests then train everyone to ignore red — the most
  expensive habit a suite can teach.
- **Guard adopted:** frozen-clock fixtures; playbook flakiness policy
  (quarantine visibly, fix in days).
- **Modern practice:** Google's flaky-test taxonomy and quarantine-with-
  accountability workflow.

## L-007 — "Verify before push" must be a gate, not a memory

- **What happened (2026-07-22):** main had been red for 4+ commits — a push
  went out without the format pass, and a 320px overflow regression shipped
  past a suite that would have caught it. Nobody noticed until the next
  session read CI.
- **Structural lesson:** any verification step that relies on remembering will
  eventually be skipped — by a human or an AI session under momentum. The
  discipline has to be mechanical (CI blocking) and the _response_ to red has
  to be immediate, because a red main normalizes red.
- **Guard adopted:** CI was already blocking; the process fix is the playbook
  rule — read CI state at session start, never stack work on a red main.
- **Modern practice:** DORA — change failure rate and time-to-restore are the
  quality metrics; a red trunk is an incident, not a backlog item.

## L-008 — Tests lag features unless the definition of done includes them

- **What happened (found 2026-07-23):** sales-tax math (0042) and batch
  invoicing — money-path features shipped days earlier — had zero direct
  tests. The FMECA pass found the highest-risk untested code in the app was
  also the newest.
- **Structural lesson:** under shipping momentum, tests systematically lag the
  features that most need them, and the lag concentrates risk in exactly the
  newest (least-understood) code. "Feature complete" without its tests is
  risk-complete.
- **Guard adopted:** both money files now mutation-gated in CI; playbook rule:
  money-path changes land with tests in the same commit (TDD red-first).
- **Modern practice:** testing-trophy placement of effort + same-PR test
  requirements; AI-era reviews reject untested generated code on sight.

## L-009 — Bars must measure an enforceable surface

- **What happened (2026-07-23):** the S1 coverage bar (0.8 unit-branch) set a
  day earlier was aspirational — it measured whole-file unit branches while
  the repo's own architecture assigns read hooks to e2e. The bar was never
  met by any commit and had to be recalibrated mid-run, with rationale.
- **Structural lesson:** a quality bar nobody can meet on the surface it
  measures is noise that erodes trust in all the other bars. Set bars from
  measured reality, then ratchet; never from aspiration.
- **Guard adopted:** `bars_rationale` in registry.json records every
  recalibration; ratchet rule in the playbook.
- **Modern practice:** ratcheting quality gates (raise floors as reality
  improves) over big-bang targets.

## L-010 — Coverage measures execution; mutation measures verification

- **What happened (2026-07-23):** invoices/hooks had 65% statement coverage
  but a 48.9% mutation score — a third of the "covered" logic wasn't actually
  pinned by any assertion. Targeted tests raised the covered mutation score
  to 74.9% with only ~20 tests.
- **Structural lesson:** coverage says the line ran; mutation says a test
  would notice if it changed. On money paths, only the second number counts.
- **Guard adopted:** stryker scope extended to the money files, gated in CI.
- **Modern practice:** mutation testing as the check-on-the-checkers;
  covered-score as the honest per-file signal.

## L-011 — Not every mutation survivor is a gap

- **What happened (2026-07-23):** board/hooks' one logic survivor
  (`cap !== undefined → true`) turned out to be an equivalent mutant —
  `count > undefined` is always false, so the mutation cannot change behavior.
- **Structural lesson:** survivors need triage (real gap vs cosmetic literal
  vs equivalent mutant) before chasing them; chasing 100% burns effort on
  unkillable mutants.
- **Modern practice:** the equivalent-mutant problem is well documented —
  treat mutation score as a signal to investigate, not a target to max.

## L-012 — Formatters can change meaning in prose

- **What happened (2026-07-23):** prettier's markdown escaping turned
  `card_external` + `_(italic)_` in a table cell into `card*external` + a
  stray `\_` — visibly corrupting the rendered doc, non-idempotently.
- **Structural lesson:** formatters are semantic-preserving for code but only
  best-effort for markdown emphasis edge cases. Ambiguous underscore/emphasis
  content belongs in code spans; formatter output on docs deserves a glance.
- **Guard adopted:** code-span identifiers in markdown tables; format:check
  in CI catches non-idempotency.

## L-013 — Know the delta between runtime and type-system targets

- **What happened (2026-07-23):** a generated test used `Map.groupBy` — fine
  on the node runtime, absent from the tsconfig lib target. Typecheck caught
  it before CI.
- **Structural lesson:** "it runs" and "it typechecks" diverge exactly at the
  newest APIs; the typecheck gate is the guard, keep it blocking. When
  writing for this repo, target the tsconfig lib, not the local node.

## L-014 — Dormant features still need their seams tested

- **What happened (2026-07-23):** the email-send seam (queue_email through
  the outbox) had zero coverage at any level — it ships in prod but is
  dormant until Resend secrets are set, so no test tier ever exercised it.
- **Structural lesson:** "dormant until configured" code rots silently and
  will be trusted the day it's switched on. Test the seam's contract now
  (op shape, ordering, refusals) even when delivery can't run.
- **Guard adopted:** emailSend.test.ts pins the full op contract.

---

## External comparison — 2026-07-23

Practices above cross-checked against current material; no contradictions
found, two reinforcements adopted (blameless framing throughout; postmortem →
action-item-with-owner structure mirrored by our three-artifact rule):

- [Rootly — postmortem meeting guide (2026)](https://rootly.com/incident-postmortems/meeting-guide)
- [Xurrent — blameless postmortems](https://www.xurrent.com/blog/blameless-postmortems)
- [FireHydrant — blameless retrospectives](https://firehydrant.com/blog/what-are-blameless-retrospectives-do-they-work-how/)
- [Google Testing Blog — where flaky tests come from](https://testing.googleblog.com/2017/04/where-do-our-flaky-tests-come-from.html)
- [Kent C. Dodds — testing trophy](https://kentcdodds.com/blog/the-testing-trophy-and-testing-classifications)
- [web.dev — fit the testing strategy to the app](https://web.dev/articles/ta-strategies)
- [Harness — regression testing in CI/CD](https://www.harness.io/blog/regression-testing-in-ci-cd-deliver-faster-without-the-fear)
- [metacto — AI-generated code review standards](https://www.metacto.com/blogs/establishing-code-review-standards-for-ai-generated-code)
