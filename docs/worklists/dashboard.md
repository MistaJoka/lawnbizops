# Dashboard / Home — worklist

Screens: [home (index)](../../src/routes/_authed/index.tsx) ·
[dashboard](../../src/routes/_authed/dashboard.tsx) ·
feature: `src/features/dashboard/hooks.ts`

Apply all four rubric lenses (README) to each item.

- [x] Edge padding `px-edge`; headings `heading-stencil`; cards uniform padding/radius. _(verified 2026-07-19, already correct: both screens use px-edge headers/sections, heading-stencil titles, uniform border-2 border-edge bg-panel p-4 cards.)_
- [x] KPI/stat numbers use `tabular-nums`, right-aligned where compared; money via `src/lib/format.ts`. _(done 2026-07-19: Metric values + Stage counts now tabular-nums; money already formatCents.)_
- [x] Positive/negative trends use `text-go`/`text-alert`, not raw colors. _(verified 2026-07-19, already correct: tone map is token-only — go/blaze/khaki/sand values, alert subline for overdue tasks.)_
- [x] Empty (new user / no data) uses `EmptyState` with a clear next-step CTA; loading uses `Skeleton`. _(done 2026-07-19: Today's hand-rolled empty block now renders the shared EmptyState (+ Add job CTA preserved); dashboard keeps informative zeros — its new-user activation lives in the Home ActivationCard by design. Loading was already SkeletonList on both.)_
- [x] Quick-action tiles ≥44px; primary action `bg-blaze`. _(verified 2026-07-19, already correct: Metric tiles are full cards (~90px); Today's + Add job CTA is bg-blaze.)_
- [x] Aggregations memoized; no heavy recompute on each render. _(verified 2026-07-19, already correct: all aggregation happens in the dashboard_metrics RPC; the client only formats.)_
- [x] Dates shown via `localToday()`-derived values; "today" framing correct. _(verified 2026-07-19, already correct: Today feed keyed on localToday(); dashboard ranges computed server-side from current_date in org-local semantics.)_

## Flow — lead→done (from e2e-audit-2026-06-24)

- [x] Dispatch: show **client name** on each route stop (not just property label — "Home/Home/Home" is ambiguous). _(done 2026-06-25: "Client · Property"; verified.)_
- [x] Dispatch: make **unpinned jobs** (no lat/lng) tappable → job detail so the operator can add a location. _(done 2026-06-25: links to /jobs/$id with a "tap to add address" hint.)_
