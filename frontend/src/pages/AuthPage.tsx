import { useQueryClient } from '@tanstack/react-query'
import { type FormEvent, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { type SignupResult, login, signup } from '../api'
import { BrandMark } from '../components/BrandMark'
import { NightSky } from '../components/NightSky'
import { SpinLink } from '../components/SpinLink'
import { useIntakes } from '../hooks/useIntakes'
import { usePageTitle } from '../usePageTitle'

const COPY = {
  login: { eyebrow: 'Welcome back', title: 'Log in', submit: 'Log in', busy: 'Logging in…', prompt: 'New here?', link: 'Create an account', to: '/signup' },
  signup: { eyebrow: 'Get started', title: 'Create your account', submit: 'Create account', busy: 'Creating account…', prompt: 'Already have an account?', link: 'Log in', to: '/login' },
} as const

export function AuthPage({ mode }: { mode: 'login' | 'signup' }) {
  const copy = COPY[mode]
  usePageTitle(copy.title)
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [intakeKey, setIntakeKey] = useState('')
  const intakes = useIntakes()
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (mode === 'signup' && password.length < 8) {
      setError('Use a password of at least 8 characters.')
      return
    }
    if (mode === 'signup' && !intakeKey) {
      setError('Choose your intake.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const me = await (mode === 'login' ? login(email, password) : signup(email, password, intakeKey))
      queryClient.clear()
      queryClient.setQueryData(['me'], me)
      const from = (location.state as { from?: string } | null)?.from
      const prefilled = mode === 'signup' ? (me as SignupResult).prefilled_through_week : null
      if (prefilled) {
        navigate('/', { replace: true, state: { prefilledThroughWeek: prefilled } })
      } else {
        navigate(from && !['/login', '/signup', '/welcome'].includes(from) ? from : '/', { replace: true })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.')
      setBusy(false)
    }
  }

  return (
    <main className="auth-page">
      <NightSky />
      <SpinLink to="/welcome" state={location.state} direction="back" className="auth-back">
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M15 6l-6 6 6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Back
      </SpinLink>
      <div className={`lp-wrap auth-grid is-${mode}`}>
        <div className="auth-col">
          <span className="lp-cloud">
            <BrandMark width={220} height={160} />
          </span>
          <span className="lp-eyebrow">{copy.eyebrow}</span>
          <h1>{copy.title}</h1>
          <form className="form auth-form" onSubmit={onSubmit} noValidate>
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
              <>
                <p id="password-hint" className="muted small">
                  At least 8 characters.
                </p>
                <label className="field">
                  <span>Intake</span>
                  <select required value={intakeKey} onChange={(e) => setIntakeKey(e.target.value)} aria-describedby="intake-hint">
                    <option value="" disabled>
                      {intakes.isError ? "Couldn't load intakes. Reload to try again." : 'Choose your intake'}
                    </option>
                    {intakes.data?.map((i) => (
                      <option key={i.key} value={i.key}>
                        {i.title}
                      </option>
                    ))}
                  </select>
                </label>
                <p id="intake-hint" className="muted small">
                  When you started, and full-time or part-time. You can change it later in Settings.
                </p>
              </>
            )}
            {error && (
              <p role="alert" className="error">
                {error}
              </p>
            )}
            <button type="submit" className="lp-btn lp-btn-primary auth-submit" disabled={busy}>
              {busy ? copy.busy : copy.submit}
            </button>
          </form>
          <p className="auth-alt">
            {copy.prompt}{' '}
            <SpinLink to={copy.to} state={location.state} direction={mode === 'login' ? 'forward' : 'back'}>
              {copy.link}
            </SpinLink>
          </p>
        </div>
      </div>
    </main>
  )
}
