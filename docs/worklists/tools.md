# Tools (calculators) — worklist

Screens: [index](../../src/routes/_authed/tools/index.tsx) ·
[grade](../../src/routes/_authed/tools/grade.tsx) ·
[mulch](../../src/routes/_authed/tools/mulch.tsx)

Apply all four rubric lenses (README) to each item.

- [x] Index: tool cards uniform padding/radius; tap targets ≥44px; edge padding `px-edge`. _(verified 2026-07-19, already correct: card-surface min-h-32/40 tiles, px-edge grid.)_
- [x] Grade + mulch: inputs use `Field` with labels and units; numeric inputs use `tabular-nums`. _(done 2026-07-19: mulch inputs now tabular-nums (labels already carry units); grade has no inputs — it reads the tilt sensor.)_
- [x] Calculation results align cleanly; round/format consistently; show units. _(done 2026-07-19: results now tabular-nums; toFixed(2) cu yd / toFixed(1) % with units were already consistent.)_
- [x] Validate inputs (no NaN, no negative); empty/initial state is clear, not a blank result. _(done 2026-07-19: mulch hid the result card for NaN but showed "0.00 cu yd" for empty/negative input — result now hidden until yards > 0; grade shows "—" until the sensor reports and a clear message when unsupported.)_
- [x] Headings `heading-stencil`; colors are tokens; primary action `bg-blaze`. _(verified 2026-07-19, already correct — calculators are passive, no CTA needed.)_
- [x] Verify the math is correct (spot-check grade % and mulch volume formulas). _(verified 2026-07-19: mulchVolumeCubicYards = sqft·(in/12)/27, bagsNeeded = ceil(yd³·27/bagCuFt), slope = tan(pitch)·100 — all pinned by calculators.test.ts.)_
