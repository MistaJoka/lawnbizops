export function Toggle({
  checked,
  onChange,
  label,
  id,
}: {
  checked: boolean
  onChange: (next: boolean) => void
  label: string
  id: string
}) {
  return (
    <label
      htmlFor={id}
      // min-h-touch: the switch itself is only 24px tall — the whole label row
      // is the tap target, so it must clear the 44px glove-friendly minimum.
      className="flex min-h-touch cursor-pointer items-center justify-between gap-3"
    >
      <span className="text-lg text-sand">{label}</span>
      <button
        id={id}
        type="button"
        role="switch"
        // Coerce so a role="switch" always carries aria-checked — a bare boolean
        // prop can arrive undefined (e.g. partial data) and React would then omit
        // the attribute, leaving the switch state unreadable to screen readers.
        aria-checked={Boolean(checked)}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-12 shrink-0 rounded-full border-2 transition-colors ${
          checked ? 'border-blaze bg-blaze' : 'border-edge bg-surface-highest'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-sand transition-transform ${
            checked ? 'translate-x-6 bg-canvas' : ''
          }`}
        />
      </button>
    </label>
  )
}
