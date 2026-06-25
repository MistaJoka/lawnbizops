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

- [ ] Index: row list has consistent height/padding, chevrons aligned, ≥44px targets; edge padding `px-edge`.
- [ ] Every subpage header uses `heading-stencil` and consistent back nav.
- [ ] profile: fields use `Field`; writes via `enqueue()`; no DB-owned columns.
- [ ] services: list rows align; prices are cents via `src/lib/format.ts`; add/edit via `enqueue()` + `crypto.randomUUID()`.
- [ ] preferences: toggles use `Toggle`; state persists via `enqueue()`; immediate optimistic feedback.
- [ ] payments: connect/disconnect states clear; secrets masked; destructive via `ConfirmDialog`.
- [ ] tax: rate inputs validated; cents/percentage handled correctly.
- [ ] automations: rule rows align; enabled state uses tokens; empty uses `EmptyState`.
- [ ] sync: status/freshness consistent with the app status bar; uses tokens; no raw colors.
- [ ] export: progress + success/error states; disabled-while-working; large exports don't block UI.
