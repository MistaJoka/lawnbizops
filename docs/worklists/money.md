# Money / Reports — worklist

Screens: [money](../../src/routes/_authed/money/index.tsx) ·
[reports](../../src/routes/_authed/money/reports.tsx) ·
features: `src/features/profitability/hooks.ts`, `src/features/reports/`
(`DateRangePicker.tsx`, `ReportPdf.tsx`, `range.ts`, `share.ts`)

Apply all four rubric lenses (README) to each item.

- [ ] Money summary: all figures `tabular-nums`, right-aligned; positive/negative use `text-go`/`text-alert`.
- [ ] All amounts are cents; formatted only via `src/lib/format.ts`. No ad-hoc `/100` or `toFixed` in components.
- [ ] DateRangePicker: presets glove-sized; range math via `range.ts` (covered by `range.test.ts`); dates date-only.
- [ ] Reports: totals reconcile with line detail; empty range uses `EmptyState`; loading uses `Skeleton`.
- [ ] ReportPdf + share lazy-loaded with disabled-while-working state.
- [ ] Edge padding `px-edge`; headings `heading-stencil`; cards uniform padding/radius.
- [ ] Heavy aggregations memoized; no re-compute on every render.

## Flow — lead→done (from e2e-audit-2026-06-24)

- [x] Label revenue **"Billed" vs "Collected"** consistently (job profitability = billed by invoice issued*at; client/dashboard = collected by payment paid_at). *(verified 2026-07-18, already correct: Money tab says "Collected", client economics says "Collected", job economics says "Billed", reports say "Income (collected) · cash basis".)\_
- [ ] Reports: surface **job/service-level profitability** (the `job_profitability` data exists but is only shown per-client) — e.g. most/least profitable services.
- [ ] Reports: empty sections use `EmptyState`; money columns use `tabular-nums`.
