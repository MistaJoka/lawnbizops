import { useMemo, useState } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { Field, TextInput } from '@/components/Field'
import { bagsNeeded, mulchVolumeCubicYards } from '@/lib/calculators'

export const Route = createFileRoute('/_authed/tools/mulch')({
  component: MulchCalculatorScreen,
})

function MulchCalculatorScreen() {
  const [area, setArea] = useState('')
  const [depth, setDepth] = useState('3')

  const result = useMemo(() => {
    const areaSqFt = Number(area)
    const depthIn = Number(depth)
    if (!Number.isFinite(areaSqFt) || !Number.isFinite(depthIn)) return null
    const yards = mulchVolumeCubicYards(areaSqFt, depthIn)
    // Zero/negative inputs compute to 0 — show nothing rather than "0.00 cu yd".
    if (yards <= 0) return null
    return { yards, bags: bagsNeeded(yards) }
  }, [area, depth])

  return (
    <div className="px-edge pt-6 pb-24">
      <Link to="/tools" className="inline-block py-2 pr-4 text-sm text-faded">
        ← Field tools
      </Link>
      <h1 className="heading-stencil mt-2 text-2xl text-sand">Mulch & stone</h1>
      <p className="mt-2 text-muted">Volume from bed area and mulch depth.</p>

      <div className="mt-6 flex flex-col gap-4">
        <Field label="Bed area (sq ft)">
          <TextInput
            inputMode="decimal"
            className="tabular-nums"
            placeholder="e.g. 450"
            value={area}
            onChange={(e) => setArea(e.target.value)}
          />
        </Field>
        <Field label="Depth (inches)">
          <TextInput
            inputMode="decimal"
            className="tabular-nums"
            placeholder="3"
            value={depth}
            onChange={(e) => setDepth(e.target.value)}
          />
        </Field>
      </div>

      {result && (
        <div className="card-surface mt-6 p-4">
          <p className="label-caps text-faded">Results</p>
          <p className="heading-stencil mt-2 text-3xl text-sand tabular-nums">
            {result.yards.toFixed(2)} cu yd
          </p>
          <p className="mt-2 text-lg text-muted tabular-nums">
            ≈ {result.bags} bags (2 cu ft each)
          </p>
        </div>
      )}
    </div>
  )
}
