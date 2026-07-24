# QA CASE FILE

    Case ID:  QA-lawnbizops-20260724-ui        Mode: ASSESS → fixes applied on user assignment
    Repo/pkg: /Users/andraewilliams/Projects/apps/LawnBizOps
    Changed:  cd29364..c8d88ff (UI/UX remediation pass, 5 commits, 80 files)
    Tier:     STANDARD (UI surface; two S1 money files touched — reviewed line-level)

## EVIDENCE

- Ledger read first (learning-loop protocol); findings checked against L-001..014.
- Static: lint/typecheck/format green (verify gate pre-push). Secrets: clean.
- Tiers: CI run 30061667072 on c8d88ff — **all 5 jobs green** (check, rls-test,
  e2e, e2e-demo, **mutation**). Cold cases: none reopened.
- S1-file touches reviewed line-by-line: the `?? []` null-guards in
  invoices/estimates hooks are defensive-only (restored-cache shape drift),
  correctly root-cause-paired with the build-sha cache buster in main.tsx.
  Mutation gate held with the new branches in scope.
- Visual: six screens screenshot-reviewed at 375px; 320px + axe covered by the
  green e2e-demo suite.

## FINDINGS

| ID  | Sev        | Finding                                                                                                                                                                                             | Outcome                                                                                                                                                                                      |
| --- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F1  | S2         | Toast host floated mid-content on every screen — `bottom-48` cleared FABs deleted in the same pass (L-002 pattern, UI domain); routine sync toast fired on every drain, drowning real confirmations | **FIXED** (user-assigned): docked above TabBar + safe-area; sync toast now only after offline/error recovery; cadence pinned by new outbox test; verified visually                           |
| F2  | S2-process | S1 money-hook edits shipped with zero accompanying tests — repeat of L-008                                                                                                                          | **EVIDENCED OK**: CI mutation green with the new branches in gated scope; guards are defensive-only. Logged as L-008 recurrence to watch, no code action needed                              |
| F3  | S3         | New primitives (BackLink/ActionRow/HeaderAdd) + icon/toast rules undocumented — future-session drift risk                                                                                           | **FIXED**: CLAUDE.md conventions updated                                                                                                                                                     |
| F4  | S3         | Customer-facing pages (quote/e tokens) skipped by the polish pass despite being the business's front door                                                                                           | **FIXED** (user-assigned): letterhead set, document identity, prepared-for line, ruled total, recovery/next-step copy, shared treatment across both pages; verified visually via demo tokens |

Positives recorded: cache-buster correctly scoped to the query persister (outbox
survives deploys); emoji CI guard is well-built; the pass maintained the
mutation-gated LANES test when it changed lane config — the QA gates worked on
another agent's changes exactly as designed.

Open follow-ups (backlog, not blockers): estimate approval page shows pre-tax
totals (estimates don't snapshot tax_bps — schema decision); approval RPC could
carry logo + contact for a fuller letterhead; board lane-flip motion; outdoor
legibility check on-device.

# VERDICT: **PASS** (all findings closed or evidenced; gates green)
