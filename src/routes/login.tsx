import { useState } from 'react'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { supabase } from '@/lib/supabase'

export const Route = createFileRoute('/login')({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession()
    if (data.session) {
      throw redirect({ to: '/' })
    }
  },
  component: LoginPage,
})

function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setBusy(false)
    if (error) {
      setError(error.message)
      return
    }
    void navigate({ to: '/' })
  }

  return (
    <div className="flex min-h-dvh flex-col justify-center px-6">
      <h1 className="heading-stencil mb-1 text-center text-4xl text-khaki">LawnBizOps</h1>
      <p className="mb-10 text-center text-sm text-faded">
        Built for hard work. Let&apos;s get paid.
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-lg border border-edge bg-panel px-4 py-4 text-lg text-sand placeholder:text-faded focus:border-blaze focus:outline-none"
        />
        <input
          type="password"
          autoComplete="current-password"
          required
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-lg border border-edge bg-panel px-4 py-4 text-lg text-sand placeholder:text-faded focus:border-blaze focus:outline-none"
        />
        {error && <p className="text-sm text-alert">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="heading-stencil mt-2 rounded-lg bg-blaze px-4 py-4 text-lg text-canvas disabled:opacity-50"
        >
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}
