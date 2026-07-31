# ADR — Server-side schedule sweep vs client materialization

**Status:** Decided (documenting the architecture as settled in practice) · 2026-07-31

## Context

Recurring visits must become `jobs` rows ahead of their date ("materialization"). The open question from `docs/ship-readiness.md` (P2): should this run server-side on a timer, or stay a client responsibility?

## Decision

**Hybrid, as built — keep it.**

1. **Client trigger on app open:** `materialize_jobs(through_date)` fires once per session from the Today route (`src/routes/_authed/index.tsx`), extending the horizon (`0038_materialization_horizon.sql`). The operator opening the app is also the only consumer of the future jobs, so demand-driven extension is naturally sufficient.
2. **Nightly server sweep for everything time-critical:** `automation_sweep()` (pg_cron, 7:15 AM, `0041` + successors) owns the jobs that must happen even when the app stays closed — overdue reminder tasks/emails, visit-reminder emails, quote expiry + follow-ups, unbilled/missed-work tasks, and clearing schedule pause holds (`resume_on`).

## Rationale

- The failure mode of client-only materialization ("no future jobs materialize while the app never opens") is harmless by construction: those jobs have no audience until the app opens, and opening it materializes them before they're visible anywhere.
- Everything where absence-of-app-open _does_ hurt (customer emails, expiry, holds) already lives in the nightly sweep — i.e., the part that needed to be server-side is server-side.
- A dedicated materialization Edge Function would add a deploy artifact + secret surface for no observable behavior change.

## Consequence / future trigger

Revisit only if a consumer of future jobs appears that is not the operator's own app session — e.g. customer-facing online booking windows (`docs/worklists/growth.md`) or a crew app (`G-22`). At that point, add `materialize_jobs_all()` as sweep rule 8 rather than a new function.
