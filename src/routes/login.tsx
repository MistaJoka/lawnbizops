import { useState } from 'react'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { supabase } from '@/lib/supabase'

export const Route = createFileRoute('/login')({
  // Already signed in → skip the screen.
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession()
    if (data.session) throw redirect({ to: '/' })
  },
  component: LoginScreen,
})

type Mode = 'signin' | 'signup'

function LoginScreen() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<Mode>('signin')
  const [business, setBusiness] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setNotice(null)

    if (mode === 'signup') {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        // Names the org in the signup trigger (handle_new_user).
        options: { data: { business_name: business.trim() } },
      })
      setBusy(false)
      if (error) return setError(error.message)
      // Email confirmation on → no session yet; off → straight in.
      if (data.session) return void navigate({ to: '/' })
      return setNotice('Check your email to confirm your account, then sign in.')
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setBusy(false)
    if (error) return setError(error.message)
    void navigate({ to: '/' })
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-edge">
      <h1 className="heading-stencil text-center text-4xl text-sand">LawnBizOps</h1>
      <p className="mt-1 text-center text-sm text-muted">
        {mode === 'signin' ? 'Sign in to your business.' : 'Start your business account.'}
      </p>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-3">
        {mode === 'signup' && (
          <input
            type="text"
            required
            placeholder="Business name"
            autoComplete="organization"
            value={business}
            onChange={(e) => setBusiness(e.target.value)}
            className="rounded-lg border-2 border-edge bg-panel px-4 py-4 text-lg text-sand placeholder:text-faded focus:border-blaze focus:outline-none"
          />
        )}
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-lg border-2 border-edge bg-panel px-4 py-4 text-lg text-sand placeholder:text-faded focus:border-blaze focus:outline-none"
        />
        <input
          type="password"
          autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
          required
          minLength={8}
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-lg border-2 border-edge bg-panel px-4 py-4 text-lg text-sand placeholder:text-faded focus:border-blaze focus:outline-none"
        />

        {error && <p className="text-sm text-alert">{error}</p>}
        {notice && <p className="text-sm text-go">{notice}</p>}

        <button
          type="submit"
          disabled={busy}
          className="heading-stencil tap-active mt-2 rounded-lg bg-blaze px-4 py-4 text-lg text-on-cta disabled:opacity-50"
        >
          {busy ? 'Working…' : mode === 'signin' ? 'Sign in' : 'Create account'}
        </button>
      </form>

      <button
        onClick={() => {
          setMode((m) => (m === 'signin' ? 'signup' : 'signin'))
          setError(null)
          setNotice(null)
        }}
        className="tap-active mt-6 py-2 text-center text-sm text-faded"
      >
        {mode === 'signin'
          ? 'New here? Create a business account'
          : 'Already have an account? Sign in'}
      </button>
    </div>
  )
}
