# LawnBizOps

Mobile-first PWA for one solo South FL landscaper. Full plan + phase status:
`/Users/andraewilliams/.claude/plans/business-system-for-a-witty-milner.md`.

Primary device: **Android Galaxy S26 Ultra (Chrome)** — Google Maps URLs for
deep links, but keep the cross-platform app-managed outbox (no SW Background
Sync dependence). **Auth is OFF for now** (migration 0004: anon policies +
placeholder user_id default; `_authed` layout kept as the re-auth seam). Add
real auth before sensitive client data (gate codes) ships.

## Iron rules

- **Every write goes through the outbox** — `enqueue()` in `src/lib/outbox.ts`.
  Never call `supabase.from(...).insert/update/delete` directly from UI code.
  New rows get client-generated `crypto.randomUUID()` ids (idempotent upserts).
- **Never** include `user_id`, `created_at`, `updated_at` in upsert payloads —
  DB defaults and triggers own those.
- **Money is integer cents**; format only at the edge via `src/lib/format.ts`.
- **Dates are date-only strings** from device-local time (`localToday()`),
  never UTC midnight.
- Do NOT replace the outbox with TanStack Query mutation persistence (known
  footguns: TanStack/query#5847, #6825).
- The service worker never caches `*.supabase.co` — data caching belongs to
  TanStack Query + the Dexie persister.

## Backend

Supabase project `Lawn Tools` (`kjovmqtcalrfdguccnfm`, us-east-1). Schema
changes: write `supabase/migrations/NNNN_name.sql` AND apply via the Supabase
MCP `apply_migration`, then regenerate `src/lib/database.types.ts` (MCP
`generate_typescript_types`; keep the `FutureTable` stubs noted in that file
until all SyncTable tables exist). Run MCP `get_advisors` (security) after
DDL. Every table: `user_id default auth.uid()` + RLS policy, `text + check`
statuses, `set_updated_at` trigger.

## Conventions

- Feature folders: `src/features/<entity>/hooks.ts` (+ form components).
  Reads = TanStack Query keys like `['clients']`, `['clients', id]`; writes =
  optimistic `setQueryData` + `enqueue`.
- Routes: TanStack Router file routes in `src/routes/_authed/` (one file =
  Route + components; eslint allows it).
- Theme tokens (Tailwind v4, dark tactical): bg-canvas/panel, border-edge,
  text-sand/faded/khaki, bg-blaze (CTA), text-go/alert. Headers:
  `heading-stencil`. Big glove-friendly tap targets.
- Verify before claiming done:
  `npx prettier --write . && npm run lint && npm test && npm run build`
- Preview server: `.claude/launch.json` → `dev` (port 5173). preview_fill
  doesn't trigger React onChange — use native-setter + input event via
  preview_eval when driving forms.
