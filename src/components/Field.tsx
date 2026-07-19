const inputClass =
  'w-full min-h-touch rounded-lg border-2 border-edge bg-surface-highest px-4 py-3 text-lg text-sand placeholder:text-faded focus:border-blaze focus:outline-none focus:ring-2 focus:ring-blaze/20'

export function Field({
  label,
  error,
  children,
}: {
  label: string
  /** Inline validation message — renders in alert red under the input. Lives
   *  inside the wrapping <label>, so assistive tech reads it with the field. */
  error?: string
  children: React.ReactNode
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="label-caps text-khaki">{label}</span>
      {children}
      {error && <span className="text-sm text-alert">{error}</span>}
    </label>
  )
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={inputClass} />
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={3} {...props} className={inputClass} />
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={inputClass} />
}

export function PrimaryButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className="heading-stencil tap-active min-h-touch w-full rounded-lg bg-blaze px-4 py-3 text-lg text-on-cta disabled:opacity-50"
    />
  )
}

/** Neutral action — the repeated bordered-panel pattern, named once. */
export function SecondaryButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className="heading-stencil tap-active min-h-touch w-full rounded-lg border-2 border-edge bg-panel px-4 py-3 text-base text-sand disabled:opacity-50"
    />
  )
}

/** Destructive action — outlined alert so it reads as caution, not a CTA. */
export function DangerButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className="heading-stencil tap-active min-h-touch w-full rounded-lg border-2 border-alert px-4 py-3 text-base text-alert disabled:opacity-50"
    />
  )
}
