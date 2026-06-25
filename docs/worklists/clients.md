# Clients — worklist

Screens: [list](../../src/routes/_authed/clients/index.tsx) ·
[new](../../src/routes/_authed/clients/new.tsx) ·
[detail](../../src/routes/_authed/clients/$clientId.index.tsx) ·
[edit](../../src/routes/_authed/clients/$clientId.edit.tsx) ·
[import](../../src/routes/_authed/clients/import.tsx) ·
form: `src/features/clients/ClientForm.tsx`

Apply all four rubric lenses (README) to each item.

- [ ] List: edge padding uses `px-edge`; header uses `heading-stencil`.
- [ ] List: empty state uses `EmptyState` with an "Add client" CTA; loading uses `Skeleton`.
- [ ] List: each row's tap target is full-width and ≥44px; phone/value text uses `tabular-nums`.
- [ ] Detail: label/value rows align into clean columns; status via `StatusChip`.
- [ ] Detail: any delete/archive goes through `ConfirmDialog`.
- [ ] ClientForm: every field wrapped in `Field` with a real label; submit disabled while pending.
- [ ] ClientForm + edit: writes go through `enqueue()`; new rows get `crypto.randomUUID()`; no `user_id/created_at/updated_at` in payload.
- [ ] Import: progress/empty/error states present; large lists windowed; malformed rows surfaced, not silently dropped.
- [ ] All screens: colors are tokens only (no `gray-*`/hex); primary CTA is `bg-blaze`.
