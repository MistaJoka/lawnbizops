import { useState } from 'react'
import { TextInput } from '@/components/Field'
import { presetRange, type DateRange, type RangePreset } from './range'

const PRESETS: { key: Exclude<RangePreset, 'custom'>; label: string }[] = [
  { key: 'month', label: 'Month' },
  { key: 'quarter', label: 'Quarter' },
  { key: 'year', label: 'Year' },
]

export function DateRangePicker({
  value,
  onChange,
}: {
  value: DateRange
  onChange: (range: DateRange) => void
}) {
  const [preset, setPreset] = useState<RangePreset>('month')

  return (
    <div className="flex flex-col gap-2">
      <div className="flex rounded-lg border border-edge bg-panel p-1">
        {PRESETS.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => {
              setPreset(p.key)
              onChange(presetRange(p.key))
            }}
            className={`heading-stencil min-h-11 flex-1 rounded-lg px-2 py-2 text-xs ${
              preset === p.key ? 'bg-blaze text-on-cta' : 'text-faded'
            }`}
          >
            {p.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setPreset('custom')}
          className={`heading-stencil min-h-11 flex-1 rounded-lg px-2 py-2 text-xs ${
            preset === 'custom' ? 'bg-blaze text-on-cta' : 'text-faded'
          }`}
        >
          Custom
        </button>
      </div>

      {preset === 'custom' && (
        <div className="flex items-center gap-2">
          <TextInput
            type="date"
            value={value.start}
            onChange={(e) => onChange({ ...value, start: e.target.value })}
          />
          <span className="text-faded">→</span>
          <TextInput
            type="date"
            value={value.end}
            onChange={(e) => onChange({ ...value, end: e.target.value })}
          />
        </div>
      )}
    </div>
  )
}
