import { type FormEvent, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ApiError, requestPasswordReset, resetPassword } from '../api'
import { SpinLink } from '../components/SpinLink'
import { usePageTitle } from '../usePageTitle'
import { AuthShell, FieldError } from './AuthPage'

const EXPIRED = 'This reset link has expired or has already been used. Ask for a new one.'

function BackToLogin() {
  return (
    <div className="auth-alt">
      <p>
        <SpinLink to="/login" direction="back">
          Back to log in
        </SpinLink>
      </p>
    </div>
  )
}

export function ForgotPasswordPage() {
  usePageTitle('Reset your password')
  const [email, setEmail] = useState('')
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    const trimmed = email.trim()
    const problem = !trimmed
      ? 'Enter your email address.'
      : !/^[^\s@]+@[^\s@]+$/.test(trimmed)
        ? 'Enter an email address like name@example.com.'
        : null
    setFieldError(problem)
    if (problem) {
      inputRef.current?.focus()
      return
    }
    setBusy(true)
    try {
      await requestPasswordReset(trimmed)
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell greeting="Happens to us all" title="Reset your password" variant="login" back="/login">
      {sent ? (
        <p role="status" className="auth-done">
          If there's an account for that email, we've sent a link to reset your password. It expires in an hour. Check your
          spam folder if it doesn't arrive.
        </p>
      ) : (
        <form className="form auth-form" onSubmit={onSubmit} noValidate>
          <p className="auth-done">Enter the email you signed up with and we'll send you a link to set a new password.</p>
          <label className="field">
            <span>Email</span>
            <input
              ref={inputRef}
              name="email"
              type="email"
              autoComplete="email"
              required
              readOnly={busy}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setFieldError(null)
                setError(null)
              }}
              aria-invalid={fieldError ? true : undefined}
              aria-describedby={fieldError ? 'email-error' : undefined}
            />
          </label>
          {fieldError && <FieldError id="email-error">{fieldError}</FieldError>}
          {error && (
            <p role="alert" className="auth-error">
              {error}
            </p>
          )}
          <button type="submit" className="pixel-btn auth-submit" disabled={busy}>
            {busy ? 'Sending…' : 'Send reset link'}
          </button>
        </form>
      )}
      <BackToLogin />
    </AuthShell>
  )
}

export function ResetPasswordPage() {
  usePageTitle('Set a new password')
  const navigate = useNavigate()
  const location = useLocation()
  // Read once: the token comes in the URL fragment so it never reaches server logs.
  const [token] = useState(() => new URLSearchParams(location.hash.slice(1)).get('token') ?? '')
  const [password, setPassword] = useState('')
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [expired, setExpired] = useState(!token)
  const [busy, setBusy] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Take the token out of the address bar, so it isn't left in history or shared by copying the URL.
  useEffect(() => {
    if (location.hash) navigate(location.pathname, { replace: true })
  }, [location.hash, location.pathname, navigate])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    if (password.length < 8) {
      setFieldError('Use a password of at least 8 characters.')
      inputRef.current?.focus()
      return
    }
    setBusy(true)
    try {
      await resetPassword(token, password)
      navigate('/login', { replace: true, state: { notice: 'Password changed. Log in with your new password.' } })
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) setExpired(true)
      else setError(err instanceof Error ? err.message : 'Something went wrong. Try again.')
      setBusy(false)
    }
  }

  return (
    <AuthShell greeting="Fresh start" title="Set a new password" variant="login" back="/login">
      {expired ? (
        <div className="auth-alt">
          <p role="alert" className="auth-error">
            {EXPIRED}
          </p>
          <p>
            <SpinLink to="/forgot-password" direction="back">
              Get a new link
            </SpinLink>
          </p>
        </div>
      ) : (
        <form className="form auth-form" onSubmit={onSubmit} noValidate>
          <label className="field">
            <span>New password</span>
            <input
              ref={inputRef}
              name="password"
              type="password"
              autoComplete="new-password"
              required
              readOnly={busy}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setFieldError(null)
                setError(null)
              }}
              aria-invalid={fieldError ? true : undefined}
              aria-describedby={['password-hint', fieldError && 'password-error'].filter(Boolean).join(' ')}
            />
          </label>
          <p id="password-hint" className="auth-hint">
            At least 8 characters. Pick a new one, not your Yoobee password.
          </p>
          {fieldError && <FieldError id="password-error">{fieldError}</FieldError>}
          {error && (
            <p role="alert" className="auth-error">
              {error}
            </p>
          )}
          <button type="submit" className="pixel-btn auth-submit" disabled={busy}>
            {busy ? 'Saving…' : 'Set new password'}
          </button>
        </form>
      )}
      <BackToLogin />
    </AuthShell>
  )
}
