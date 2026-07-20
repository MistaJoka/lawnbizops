# Settings — worklist

Screens: [index](../../src/routes/_authed/settings/index.tsx) ·
[profile](../../src/routes/_authed/settings/profile.tsx) ·
[services](../../src/routes/_authed/settings/services.tsx) ·
[preferences](../../src/routes/_authed/settings/preferences.tsx) ·
[payments](../../src/routes/_authed/settings/payments.tsx) ·
[tax](../../src/routes/_authed/settings/tax.tsx) ·
[automations](../../src/routes/_authed/settings/automations.tsx) ·
[sync](../../src/routes/_authed/settings/sync.tsx) ·
[export](../../src/routes/_authed/settings/export.tsx) ·
feature: `src/features/settings/hooks.ts`, `src/features/services/hooks.ts`

Apply all four rubric lenses (README) to each item. Each subpage is its own
iteration — settings is large, so keep changes per-page.

- [x] Index: row list has consistent height/padding, chevrons aligned, ≥44px targets; edge padding `px-edge`. _(verified 2026-07-19, already correct: one shared row class — px-4 py-4 bordered rows (~56px), px-edge root.)_
- [x] Every subpage header uses `heading-stencil` and consistent back nav. _(verified 2026-07-19, already correct: all subpages heading-stencil with a "← Settings" link; settings/tax.tsx links "← Taxes" because its parent hub is /tax — consistent with where it's entered from.)_
- [x] profile: fields use `Field`; writes via `enqueue()`; no DB-owned columns. _(verified 2026-07-19, already correct: Field everywhere; business_settings is the codebase's one SANCTIONED OUTBOX EXCEPTION (documented in features/settings/hooks.ts — single-row upsert, last-write-wins is right); payload is TablesInsert-typed with no user_id/timestamps.)_
- [x] services: list rows align; prices are cents via `src/lib/format.ts`; add/edit via `enqueue()` + `crypto.randomUUID()`. _(done 2026-07-19: price column now tabular-nums; cents/formatCents, enqueue + randomUUID were already right.)_
- [x] preferences: toggles use `Toggle`; state persists via `enqueue()`; immediate optimistic feedback. _(verified 2026-07-19, already correct with a caveat that's by design: these are device preferences (data-saver, today view) persisted to localStorage on purpose — the screen says "saved locally"; org data never lives here.)_
- [x] payments: connect/disconnect states clear; secrets masked; destructive via `ConfirmDialog`. _(resolved 2026-07-19: page was rewritten for honesty — it records a provider preference only, says online collection isn't built yet, and holds no secrets to mask or connections to destroy.)_
- [x] tax: rate inputs validated; cents/percentage handled correctly. _(verified 2026-07-19, already correct: mileage rate parsed via parseDollarsToCents with ?? 0 fallback, stored as cents.)_
- [x] automations: rule rows align; enabled state uses tokens; empty uses `EmptyState`. _(verified 2026-07-19, already correct: fixed set of Toggle rows (never empty, so EmptyState n/a); Toggle is token-only; includes the new email-reminder toggles.)_
- [x] sync: status/freshness consistent with the app status bar; uses tokens; no raw colors. _(verified 2026-07-19, already correct: same outbox-derived status source as the top bar; grep finds no raw colors.)_
- [x] export: progress + success/error states; disabled-while-working; large exports don't block UI. _(verified 2026-07-19, already correct: per-dataset busy state disables all rows, success reports row count, failure sets an error line; datasets are fetched then CSV'd in one async pass — no render-blocking loops at this data scale.)_
