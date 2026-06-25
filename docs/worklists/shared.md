# Shared components — worklist

Components in `src/components/`: `TabBar`, `Fab`, `StatusChip`, `EmptyState`,
`Skeleton`, `Toast`, `Sheet`, `ConfirmDialog`, `Field`, `Toggle`,
`ActivityTimeline`, `JobStepper`, `QueryError`, `AppErrorFallback`.

These are leverage points — fixing one improves every screen. Apply all four
rubric lenses (README).

- [ ] TabBar: items evenly spaced, active state uses tokens, all targets ≥44px, safe-area inset respected.
- [ ] Fab: consistent position/size across screens; ≥44px; `bg-blaze`; doesn't cover content/TabBar.
- [ ] StatusChip: every status value maps to a token color; consistent padding/radius/size.
- [ ] EmptyState: consistent icon/title/body/CTA layout; CTA is `bg-blaze`.
- [ ] Skeleton: matches the shape of the content it stands in for (no layout shift on load).
- [ ] Toast: readable contrast; auto-dismiss timing sane; stacking handled.
- [ ] Sheet: backdrop, drag/close affordance, safe-area inset, scroll lock.
- [ ] ConfirmDialog: destructive action styled `text-alert`; cancel is the safe default focus.
- [ ] Field: label association (`htmlFor`/`id`), error slot, consistent spacing; used everywhere inputs appear.
- [ ] Toggle: ≥44px hit area; on/off states use tokens; accessible role/label.
- [ ] ActivityTimeline: entries align; timestamps `tabular-nums`; empty uses `EmptyState`.
- [ ] QueryError / AppErrorFallback: consistent layout, retry action, tokenized colors.
