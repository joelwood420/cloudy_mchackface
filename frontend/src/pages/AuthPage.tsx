import { useQueryClient } from '@tanstack/react-query'
import { type FormEvent, type ReactNode, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { type SignupResult, login, signup } from '../api'
import { BrandMark } from '../components/BrandMark'
import { NightSky } from '../components/NightSky'
import { SpinLink } from '../components/SpinLink'
import { useIntakes } from '../hooks/useIntakes'
import { usePageTitle } from '../usePageTitle'

const COPY = {
  login: {
    greeting: 'Welcome back',
    title: 'Log in',
    submit: 'Log in',
    busy: 'Logging in…',
    prompt: 'New here?',
    link: 'Create an account',
    to: '/signup',
  },
  signup: {
    greeting: 'Welcome aboard',
    title: 'Create your account',
    submit: 'Create account',
    busy: 'Creating account…',
    prompt: 'Already have an account?',
    link: 'Log in',
    to: '/login',
  },
} as const

type Field = 'email' | 'password' | 'intake'
type FieldErrors = Partial<Record<Field, string>>
const FIELDS: Field[] = ['email', 'password', 'intake']

// Intake titles end in the programme code, which is the same for every option; in the list it's only noise.
const intakeLabel = (title: string) => title.replace(/\s*\(NZ\d+\)$/, '')

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
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const from = (location.state as { from?: string } | null)?.from
  const notice = (location.state as { notice?: string } | null)?.notice

  // Every problem at once, so nobody has to submit three times to find them all.
  function check(): FieldErrors {
    const found: FieldErrors = {}
    if (!email.trim()) found.email = 'Enter your email address.'
    else if (!/^[^\s@]+@[^\s@]+$/.test(email.trim())) found.email = 'Enter an email address like name@example.com.'
    if (mode === 'login' && !password) found.password = 'Enter your password.'
    if (mode === 'signup' && password.length < 8) found.password = 'Use a password of at least 8 characters.'
    if (mode === 'signup' && !intakeKey) found.intake = 'Choose your intake.'
    return found
  }

  // A field's message goes as soon as you change that field.
  function edited(field: Field) {
    setError(null)
    setFieldErrors((current) => {
      if (!current[field]) return current
      const next = { ...current }
      delete next[field]
      return next
    })
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    const found = check()
    setFieldErrors(found)
    setError(null)
    const first = FIELDS.find((f) => found[f])
    if (first) {
      formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus()
      return
    }
    setBusy(true)
    try {
      const me = await (mode === 'login' ? login(email.trim(), password) : signup(email.trim(), password, intakeKey))
      queryClient.clear()
      queryClient.setQueryData(['me'], me)
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

  const describedBy = (field: Field, hint?: string) => [fieldErrors[field] && `${field}-error`, hint].filter(Boolean).join(' ') || undefined
  const problems = FIELDS.map((f) => fieldErrors[f]).filter(Boolean)

  return (
    <AuthShell greeting={copy.greeting} title={copy.title} variant={mode}>
      {notice && (
        <p role="status" className="auth-notice">
          {notice}
        </p>
      )}
      <form ref={formRef} className="form auth-form" onSubmit={onSubmit} noValidate>
        {/* Read out once on submit; each message also sits under its own field. */}
        {problems.length > 0 && (
          <p role="alert" className="sr-only">
            {problems.join(' ')}
          </p>
        )}
        <label className="field">
          <span>Email</span>
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            readOnly={busy}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              edited('email')
            }}
            aria-invalid={fieldErrors.email ? true : undefined}
            aria-describedby={describedBy('email')}
          />
        </label>
        {fieldErrors.email && <FieldError id="email-error">{fieldErrors.email}</FieldError>}
        <label className="field">
          <span>Password</span>
          <input
            name="password"
            type="password"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            required
            readOnly={busy}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              edited('password')
            }}
            aria-invalid={fieldErrors.password ? true : undefined}
            aria-describedby={describedBy('password', mode === 'signup' ? 'password-hint' : undefined)}
          />
        </label>
        {mode === 'signup' && (
          <p id="password-hint" className="auth-hint">
            At least 8 characters. Pick a new one, not your Yoobee password.
          </p>
        )}
        {fieldErrors.password && <FieldError id="password-error">{fieldErrors.password}</FieldError>}
        {mode === 'signup' && (
          <>
            <label className="field">
              <span>Intake</span>
              <select
                name="intake"
                required
                disabled={busy}
                value={intakeKey}
                onChange={(e) => {
                  setIntakeKey(e.target.value)
                  edited('intake')
                }}
                aria-invalid={fieldErrors.intake ? true : undefined}
                aria-describedby={describedBy('intake', 'intake-hint')}
              >
                <option value="" disabled>
                  {intakes.isPending ? 'Loading intakes…' : 'Choose your intake'}
                </option>
                {intakes.data?.map((i) => (
                  <option key={i.key} value={i.key}>
                    {intakeLabel(i.title)}
                  </option>
                ))}
              </select>
            </label>
            <p id="intake-hint" className="auth-hint">
              When you started, and full-time or part-time. Weeks already behind you get ticked for you. You can change it
              later in Settings.
            </p>
            {fieldErrors.intake && <FieldError id="intake-error">{fieldErrors.intake}</FieldError>}
            {intakes.isError && (
              <p className="auth-field-error">
                Couldn't load the intakes.{' '}
                <button type="button" className="auth-inline-button" onClick={() => void intakes.refetch()}>
                  Try again
                </button>
              </p>
            )}
          </>
        )}
        {error && (
          <p role="alert" className="auth-error">
            {error}
          </p>
        )}
        <button type="submit" className="pixel-btn auth-submit" disabled={busy}>
          {busy ? copy.busy : copy.submit}
        </button>
      </form>
      <div className="auth-alt">
        {mode === 'login' && (
          <p>
            <SpinLink to="/forgot-password" direction="forward">
              Forgot your password?
            </SpinLink>
          </p>
        )}
        <p>
          {copy.prompt}{' '}
          <SpinLink to={copy.to} state={location.state} direction={mode === 'login' ? 'forward' : 'back'}>
            {copy.link}
          </SpinLink>
        </p>
      </div>
    </AuthShell>
  )
}

/** The night-sky layout shared by the login, sign-up and password reset pages. Children go beside the cloud. */
export function AuthShell({
  greeting,
  title,
  variant,
  back = '/welcome',
  children,
}: {
  greeting: string
  title: string
  variant: string
  back?: string
  children: ReactNode
}) {
  const location = useLocation()
  return (
    <main className="auth-page">
      <NightSky />
      <SpinLink to={back} state={location.state} direction="back" className="auth-back">
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M15 6l-6 6 6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Back
      </SpinLink>
      <div className={`lp-wrap auth-grid is-${variant}`}>
        <div className="auth-col">
          <span className="lp-cloud">
            <BrandMark width={220} height={160} glint="right" />
          </span>
          <span className="auth-bubble" aria-hidden="true">
            {greeting}
          </span>
        </div>
        <div className="auth-form-side">
          {/* The cloud and its bubble say who and where; the heading is for screen readers. */}
          <h1 className="sr-only">{title}</h1>
          {children}
        </div>
      </div>
    </main>
  )
}

export function FieldError({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={id} className="auth-field-error">
      <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M12 7.5v5.5M12 16.5v.01" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      {children}
    </p>
  )
}
