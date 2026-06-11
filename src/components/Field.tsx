const inputClass =
  'w-full min-h-touch rounded-lg border-2 border-edge bg-surface-highest px-4 py-3 text-lg text-sand placeholder:text-faded focus:border-blaze focus:outline-none focus:ring-2 focus:ring-blaze/20'

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="label-caps text-khaki">{label}</span>
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
      className="heading-stencil tap-active min-h-touch w-full rounded-lg bg-blaze px-4 py-4 text-lg text-on-cta disabled:opacity-50"
    />
  )
}
