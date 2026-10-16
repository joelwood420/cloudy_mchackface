import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { fetchModules, logout } from '../api'
import { useMe } from '../hooks/useMe'
import { percent } from '../progress'
import { ProgressBar } from './ProgressBar'

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  )
}

export function Sidebar() {
  const { pathname } = useLocation()
  const modules = useQuery({ queryKey: ['modules'], queryFn: fetchModules })
  const me = useMe()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const signOut = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      navigate('/login', { replace: true })
      queryClient.clear()
    },
  })
  const modulesCurrent = pathname === '/' ? 'page' : pathname.startsWith('/modules/') ? 'true' : undefined

  return (
    <nav className="sidebar" aria-label="Main">
      <Link to="/" className="brand">
        <span className="brand-mark" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 18h4V12H4zM10 18h4V8h-4zM16 18h4V4h-4z" />
          </svg>
        </span>
        <span className="brand-text">
          <span className="brand-name">Cloudy McHackface</span>
          <span className="brand-sub">Level 6 Cloud &amp; Cyber</span>
        </span>
      </Link>

      <ul className="nav-list">
        <li>
          <span className="nav-item is-disabled">
            <Icon>
              <rect x="3" y="4" width="18" height="17" rx="2" />
              <path d="M3 9h18M8 2v4M16 2v4" />
            </Icon>
            This week
            <span className="soon">Soon</span>
          </span>
        </li>
        <li>
          <Link to="/" className="nav-item" aria-current={modulesCurrent}>
            <Icon>
              <path d="M4 6h16M4 12h16M4 18h10" />
            </Icon>
            Modules
          </Link>
        </li>
        <li>
          <span className="nav-item is-disabled">
            <Icon>
              <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
              <path d="M14 3v5h5M9 13h6M9 17h4" />
            </Icon>
            Assessments
            <span className="soon">Soon</span>
          </span>
        </li>
        <li>
          <Link to="/settings" className="nav-item" aria-current={pathname === '/settings' ? 'page' : undefined}>
            <Icon>
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
            </Icon>
            Settings
          </Link>
        </li>
      </ul>

      {modules.data && modules.data.length > 0 && (
        <section aria-labelledby="side-modules-heading">
          <h2 id="side-modules-heading" className="side-heading">
            Your modules
          </h2>
          <ul className="side-modules">
            {modules.data.map((m) => {
              const pct = percent(m.completed_count, m.task_count)
              return (
                <li key={m.key}>
                  <Link
                    to={`/modules/${m.key}`}
                    className="side-module"
                    aria-current={pathname === `/modules/${m.key}` ? 'page' : undefined}
                  >
                    <span className="side-module-top">
                      <span>{m.code}</span>
                      <span aria-hidden="true">{pct}%</span>
                    </span>
                    <span className="side-module-title">{m.title}</span>
                    <ProgressBar value={pct} label={`${m.code} progress`} size="sm" decorative />
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      <div className="sidebar-foot">
        {me.data && (
          <p className="small">
            {me.data.current_week === null ? (
              <>
                No current week yet. <Link to="/settings">Set your week</Link>
              </>
            ) : (
              <>
                You're on <strong>Week {me.data.current_week}</strong>. <Link to="/settings">Change week</Link>
              </>
            )}
          </p>
        )}
        {me.data && <p className="small muted sidebar-email">{me.data.email}</p>}
        {signOut.isError && (
          <p role="alert" className="error small">
            Couldn't log out. Try again.
          </p>
        )}
        <button type="button" className="button-secondary" onClick={() => signOut.mutate()} disabled={signOut.isPending}>
          Log out
        </button>
      </div>
    </nav>
  )
}
