# LawnBizOps

Mobile-first PWA for a solo landscaping business in South Florida. One user, one
phone: daily jobs in drive order, client/property records, invoices with gentle
payment reminders, and estimates — built offline-tolerant for field use.

## Stack

- **Vite + React 19 + TypeScript** SPA, **Tailwind CSS v4**
- **TanStack Router** (file-based) + **TanStack Query v5**
- **Supabase** (Postgres, Auth, Storage) — schema in `supabase/migrations/`
- **Dexie** (IndexedDB) — offline read cache + write outbox
- **vite-plugin-pwa** — installable app shell (the service worker never caches
  Supabase data; that is TanStack Query's job)
- **@react-pdf/renderer** — client-side invoice/estimate PDFs for the share sheet

## Development

```sh
npm install
cp .env.example .env.local   # fill in Supabase URL + publishable key
npm run dev
```

Checks (CI runs the same):

```sh
npm run lint && npm run format:check && npm test && npm run build
```

## Architecture notes

- Money is **integer cents** everywhere; formatting happens at the edge
  (`src/lib/format.ts`).
- All scheduling uses **date-only** values computed from the device's local
  date — never UTC midnight.
- Writes go through the Dexie **outbox** (`src/lib/outbox.ts`, Phase 1+): they
  apply optimistically and sync FIFO when online. iOS has no Background Sync —
  the queue flushes on app open / `online` / `visibilitychange`.
- Every table is scoped by `user_id` with RLS — single-tenant today,
  multi-tenant-ready by design.

## Database

Migrations live in `supabase/migrations/` and are applied to the hosted
project (`Lawn Tools`). After schema changes, regenerate types:

```sh
npx supabase gen types typescript --project-id kjovmqtcalrfdguccnfm > src/lib/database.types.ts
```

(requires `SUPABASE_ACCESS_TOKEN`).
