# Money / Reports — worklist

Screens: [money](../../src/routes/_authed/money/index.tsx) ·
[reports](../../src/routes/_authed/money/reports.tsx) ·
features: `src/features/profitability/hooks.ts`, `src/features/reports/`
(`DateRangePicker.tsx`, `ReportPdf.tsx`, `range.ts`, `share.ts`)

Apply all four rubric lenses (README) to each item.

- [x] Money summary: all figures `tabular-nums`, right-aligned; positive/negative use `text-go`/`text-alert`. _(done 2026-07-19: MonthHeader cells, Outstanding, aging chips, list-row amounts, and all Reports figures now `tabular-nums`; Net already tones go/alert.)_
- [x] All amounts are cents; formatted only via `src/lib/format.ts`. No ad-hoc `/100` or `toFixed` in components. _(verified 2026-07-19, already correct: grep across money routes + reports/profitability features finds no /100 or toFixed outside tests.)_
- [x] DateRangePicker: presets glove-sized; range math via `range.ts` (covered by `range.test.ts`); dates date-only. _(done 2026-07-19: preset buttons were ~36px — now `min-h-11`; range.ts math already date-only and pinned by range.test.ts.)_
- [x] Reports: totals reconcile with line detail; empty range uses `EmptyState`; loading uses `Skeleton`. _(done 2026-07-19: a fully-empty range now renders one EmptyState instead of four hollow cards; per-card empties stay compact inline text by design; P&L loading already Skeleton; totals come from the same RPCs as their breakdowns.)_
- [x] ReportPdf + share lazy-loaded with disabled-while-working state. _(verified 2026-07-19, already correct: @react-pdf + ReportPdf dynamic-imported in handleSharePdf; button disabled while `sharing`.)_
- [x] Edge padding `px-edge`; headings `heading-stencil`; cards uniform padding/radius. _(verified 2026-07-19, already correct: both screens root `px-edge`, headings heading-stencil, cards card-surface/border-edge rounded-lg.)_
- [x] Heavy aggregations memoized; no re-compute on every render. _(verified 2026-07-19, already correct: the only client-side aggregations are single O(n) passes over small lists (aging buckets, month totals) — memoizing them would cost more than it saves; heavy math lives in SQL RPCs.)_

## Flow — lead→done (from e2e-audit-2026-06-24)

- [x] Label revenue **"Billed" vs "Collected"** consistently (job profitability = billed by invoice issued*at; client/dashboard = collected by payment paid_at). *(verified 2026-07-18, already correct: Money tab says "Collected", client economics says "Collected", job economics says "Billed", reports say "Income (collected) · cash basis".)\_
- [x] Reports: surface **job/service-level profitability** (the `job_profitability` data exists but is only shown per-client) — e.g. most/least profitable services. _(done 2026-07-19: Reports gains a "Job profitability · billed" card — jobs ranked by profit over the selected range via the existing job_profitability RPC, profit toned go/alert, top-8 with count note.)_
- [x] Reports: empty sections use `EmptyState`; money columns use `tabular-nums`. _(done 2026-07-19: all money columns tabular-nums + right-aligned; whole-empty range uses EmptyState (see rubric item above for the per-card compact-empty rationale).)_
