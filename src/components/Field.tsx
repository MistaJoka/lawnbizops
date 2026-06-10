const inputClass =
  'w-full rounded-lg border border-edge bg-panel px-4 py-4 text-lg text-sand placeholder:text-faded focus:border-blaze focus:outline-none'

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="heading-stencil text-xs text-faded">{label}</span>
      {children}
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
      className="heading-stencil w-full rounded-lg bg-blaze px-4 py-4 text-lg text-canvas disabled:opacity-50"
    />
  )
}
