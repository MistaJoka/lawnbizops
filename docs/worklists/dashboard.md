# Dashboard / Home — worklist

Screens: [home (index)](../../src/routes/_authed/index.tsx) ·
[dashboard](../../src/routes/_authed/dashboard.tsx) ·
feature: `src/features/dashboard/hooks.ts`

Apply all four rubric lenses (README) to each item.

- [ ] Edge padding `px-edge`; headings `heading-stencil`; cards uniform padding/radius.
- [ ] KPI/stat numbers use `tabular-nums`, right-aligned where compared; money via `src/lib/format.ts`.
- [ ] Positive/negative trends use `text-go`/`text-alert`, not raw colors.
- [ ] Empty (new user / no data) uses `EmptyState` with a clear next-step CTA; loading uses `Skeleton`.
- [ ] Quick-action tiles ≥44px; primary action `bg-blaze`.
- [ ] Aggregations memoized; no heavy recompute on each render.
- [ ] Dates shown via `localToday()`-derived values; "today" framing correct.

## Flow — lead→done (from e2e-audit-2026-06-24)

- [x] Dispatch: show **client name** on each route stop (not just property label — "Home/Home/Home" is ambiguous). _(done 2026-06-25: "Client · Property"; verified.)_
- [x] Dispatch: make **unpinned jobs** (no lat/lng) tappable → job detail so the operator can add a location. _(done 2026-06-25: links to /jobs/$id with a "tap to add address" hint.)_
