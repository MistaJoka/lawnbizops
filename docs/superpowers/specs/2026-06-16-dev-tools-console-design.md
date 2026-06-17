# Dev Tools Console — Design Spec

**Date:** 2026-06-16
**Status:** Approved (pre-implementation)
**Author:** brainstorming session

## Problem & intent

The app's behavior is a function of four invisible variables — **the date, online/offline, who you are, and what's in the DB**. Reproducing a specific combination in development means contorting the database, waiting for real time to pass, or re-logging-in. The dev panel (one-tap demo login) is a start; this evolves it into an **instrument panel that makes those invisible variables visible and steerable in one tap.**

Scope for this iteration (chosen by the operator): **Time** and **Data scenarios**. Network/outbox and tenant-switching are deferred but the shape leaves room for them.

## Principles

- **Mobile-first, like the app itself.** No keyboard/⌘K palette — a **bottom sheet** with big touch targets, the same idiom as `QuickAddSheet`. The tool feels native because it's built like the app.
- **Always honest about fake state.** The moment a value is simulated, a banner says so — fake-clock tools that hide their state burn you.
- **Prod-safe by construction.** Everything stays behind `import.meta.env.DEV`, so Vite tree-shakes it out of production builds (already verified: `dist/` is clean).

## Shape

- **DEV button** (bottom-left, existing) → opens a **bottom sheet** of actions grouped by axis (Time, Data; room for Network/Tenant later). Touch targets ≥48px.
- **Active-state banner.** When a simulated date is set, a slim magenta strip pins to the top: `DEV · today = Mon Aug 7 · tap to reset`. Hidden when everything is real. Rendered by `DevPanel` (already in the dev-only tree), so it costs nothing in prod.

## Feature 1 — Time travel

**Controls (in the sheet):** a native `<input type="date">` plus quick taps **−1d / +1d / +1wk / +30d / +90d / Reset to real today**.

**The seam.** The whole app derives "today" from one function: `localToday()` in `src/lib/format.ts`. Add a single `import.meta.env.DEV`-gated branch there:

```ts
export function localToday(): string {
  if (import.meta.env.DEV) {
    const override = localStorage.getItem('dev:today')
    if (override) return override
  }
  // …existing real device-local computation…
}
```

The panel **writes** `localStorage['dev:today']`; `localToday()` **reads** it (no import coupling). The gated block is stripped from prod. Setting a date calls `window.location.reload()` so the new "today" propagates through every query key (`['jobs', { date }]` etc.) and component cleanly.

**What reacts:** invoice **aging / A-R color** (`agingBucket(inv, localToday())`), job "today" and the **Route view**, and the **recurrence horizon** — the client passes the shifted date to `materialize_jobs`, so the server even generates ahead.

**Honest boundary (documented in the tool):** trial-expiry is computed on the **server clock** inside `app_state`, so client time-travel won't move it. Everything date- and aging-driven — the collections surface — does move.

## Feature 2 — Data scenarios

Stripe's lesson: test clocks do half the work of fixtures. "Overdue-heavy A/R" is just the _same_ seed viewed +60 days — so it's a time-travel preset, not a new dataset. The rest are a few small mutators run **as the logged-in demo user through the normal client** (`supabase`/`enqueue`), local-only by the dev gate, each followed by a reload/invalidate:

- **Make A-R overdue** — back-date open invoices' `due_at` (or just a time-travel +60d preset).
- **Add a busy day** — insert a handful of jobs scheduled for today.
- **Clear my data** — delete this org's rows (leaf-first for FKs); the empty-business state.
- **Reset to default seed** — _not_ browser-doable (the full seed can't be rebuilt client-side). The sheet **displays the command** `supabase db reset` with a copy button.

## Components & boundaries

- `src/dev/DevPanel.tsx` — grows from a button list into the bottom sheet + active-state banner; renders the sections.
- `src/dev/devClock.ts` — tiny helpers: `setDevToday(date)`, `clearDevToday()`, `getDevToday()` (localStorage `dev:today`). The panel uses these; `format.ts` reads the raw key directly (one gated line) to avoid a `format → dev` import.
- `src/dev/scenarios.ts` — the data mutators (A-R overdue, busy day, clear), each a small async function over `supabase`.
- `src/lib/format.ts` — the one gated `localToday()` branch.

Each unit is independently understandable: the clock owns "what day is it (dev)", scenarios own "reshape the data", the panel owns presentation.

## Prod safety

`src/dev/` is imported only behind `import.meta.env.DEV` in `main.tsx`; the `localToday()` branch is gated the same way. Verification (must pass): a production `npm run build` leaves `dist/` free of the dev strings (`dev:today`, scenario labels, demo credentials) — i.e. all tree-shaken out, as already confirmed for the current panel.

## Testing & verification

- Unit: `localToday()` returns the `dev:today` override when set (in a DEV-simulated test) and the real date otherwise; `devClock` set/clear round-trips.
- Build-strip check: grep `dist/` for `dev:today` and scenario labels → absent.
- Manual (preview, mobile viewport): set today +90d → A-R lane re-tints / Money aging shifts; banner shows and clears; "Add a busy day" populates the board; "Clear my data" empties it.
- `prettier && lint && test && build` green.
