import { useQueryClient } from '@tanstack/react-query'
import { type FormEvent, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { login, signup } from '../api'
import { usePageTitle } from '../usePageTitle'

const COPY = {
  login: { title: 'Log in', submit: 'Log in', prompt: 'New here?', link: 'Create an account', to: '/signup' },
  signup: { title: 'Create your account', submit: 'Create account', prompt: 'Already have an account?', link: 'Log in', to: '/login' },
} as const

export function AuthPage({ mode }: { mode: 'login' | 'signup' }) {
  const copy = COPY[mode]
  usePageTitle(copy.title)
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (mode === 'signup' && password.length < 10) {
      setError('Use a password of at least 10 characters.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const me = await (mode === 'login' ? login : signup)(email, password)
      queryClient.clear()
      queryClient.setQueryData(['me'], me)
      const from = (location.state as { from?: string } | null)?.from
      navigate(from && from !== '/login' && from !== '/signup' ? from : '/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.')
      setBusy(false)
    }
  }

  return (
    <main className="auth-page">
      <div className="card auth-card">
        <p className="brand-name">Cloudy McHackface</p>
        <h1>{copy.title}</h1>
        <form className="form" onSubmit={onSubmit} noValidate>
          <label className="field">
            <span>Email</span>
            <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="field">
            <span>Password</span>
            <input
              type="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-describedby={mode === 'signup' ? 'password-hint' : undefined}
            />
          </label>
          {mode === 'signup' && (
            <p id="password-hint" className="muted small">
              At least 10 characters.
            </p>
          )}
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <button type="submit" className="button-primary" disabled={busy}>
            {copy.submit}
          </button>
        </form>
        <p className="muted small">
          {copy.prompt}{' '}
          <Link to={copy.to} state={location.state}>
            {copy.link}
          </Link>
        </p>
      </div>
    </main>
  )
}
