# QA CASE FILE

    Case ID:  QA-lawnbizops-20260725-features    Mode: ASSESS → gap closed in-run
    Repo/pkg: /Users/andraewilliams/Projects/apps/LawnBizOps
    Changed:  1ce62a7, 03fba25, 64adab6 (day thesis + lane motion; follow-up
              launchers; service quick-add chips)
    Tier:     STANDARD (one money path touched — invoice line pricing)

## EVIDENCE

- Ledger read first (L-001..015). No finding matched a known pattern as a
  _repeat_; one finding became a new lesson (L-015).
- CI green on all three commits — check, rls-test, e2e, e2e-demo, **mutation**.
- Local gate green each time: 435 unit + 126 demo e2e (render, axe, 320px).
- Visual verification at 375px on every changed surface.

## FINDINGS

| ID  | Sev | Finding                                                                                                                                                                                                                                                                           | Outcome                                                                                                                                                                                                                          |
| --- | --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| G1  | S2  | `ServiceQuickAdd` converted catalog cents → dollar string that the line editor re-parses into cents — an untested money round trip on the invoice path. A separator or rounding slip here puts a wrong price on a real invoice (L-008 pattern: newest code, money path, no test). | **FIXED**: extracted pure `serviceLinePrefill` (`lineDraft.ts`), 6 tests incl. a fast-check property round-tripping every price $0–$1M back to exact cents; falsifiability checked (÷1000 and toFixed(0) mutations both fail it) |
| G2  | S3  | Helper first lived in the component file, tripping the fast-refresh lint rule                                                                                                                                                                                                     | **FIXED**: own module, matching the repo's pure-helper convention (`timeOnSite.ts`, `daySummary.ts`)                                                                                                                             |
| G3  | S3  | Bundle budget re-baselined 330 → 345 in 64adab6                                                                                                                                                                                                                                   | **EVIDENCED OK**: growth audited chunk-by-chunk (react shell 90 / supabase 50 / query 33 — all load-bearing, no stray deps); dated rationale in the script header, per its own convention                                        |
| G4  | —   | `dayThesis` (8 tests, TDD red-first) and the follow-up launcher rows                                                                                                                                                                                                              | **NO ACTION**: thesis is pure + pinned; launcher rows are presentational wiring to existing hooks, covered by the e2e render/a11y/320px tier per the repo's documented split                                                     |

## SWEEP — is L-015 an open class?

Checked every primary list/form surface for "names an action but won't perform
it" and "asks you to type what the app already knows": schedule (rows route to
the job, plus bulk rain-day move), clients (call/text inline), board cards
(per-lane quick actions), money (nudge/invoice-all), inventory (edit sheet),
expense form (tap-grid categories, amount-first, optional fields disclosed).
**Follow-ups was the only instance** — now fixed. Recorded as a pinned lesson,
not an open backlog.

# VERDICT: **PASS** (one real gap found and closed in-run; no S1s; gates green)
