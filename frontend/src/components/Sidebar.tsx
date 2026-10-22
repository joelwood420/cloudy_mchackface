import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { fetchModules, logout } from '../api'
import { weekFooter } from '../format'
import { useMe } from '../hooks/useMe'
import { useThisWeek } from '../hooks/useThisWeek'
import { percent } from '../progress'
import { BrandMark } from './BrandMark'
import { ProgressBar } from './ProgressBar'
import { CompletionStamp } from './Stamp'

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
  const thisWeek = useThisWeek()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const signOut = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      navigate('/login', { replace: true })
      queryClient.clear()
    },
  })
  const modulesCurrent = pathname === '/modules' ? 'page' : pathname.startsWith('/modules/') ? 'true' : undefined
  // The phone menu remembers the page it was opened on, so moving to another page closes it.
  const [menuOpenOn, setMenuOpenOn] = useState<string | null>(null)
  const menuOpen = menuOpenOn === pathname

  return (
    <nav className={`sidebar${menuOpen ? ' is-menu-open' : ''}`} aria-label="Main">
      <div className="sidebar-top">
        <Link to="/" className="brand">
          <BrandMark />
          <span className="brand-text">
            <span className="brand-name">Cloudy McHackface</span>
            <span className="brand-sub">Level 6 Cloud &amp; Cyber</span>
          </span>
        </Link>
        <button
          type="button"
          className="menu-button"
          aria-expanded={menuOpen}
          aria-controls="sidebar-more"
          onClick={() => setMenuOpenOn(menuOpen ? null : pathname)}
        >
          {menuOpen ? 'Close' : 'Menu'}
        </button>
      </div>

      <ul className="nav-list">
        <li>
          <Link to="/" className="nav-item" aria-current={pathname === '/' ? 'page' : undefined}>
            <Icon>
              <rect x="3" y="4" width="18" height="17" rx="2" />
              <path d="M3 9h18M8 2v4M16 2v4" />
            </Icon>
            This week
          </Link>
        </li>
        <li>
          <Link to="/modules" className="nav-item" aria-current={modulesCurrent}>
            <Icon>
              <path d="M4 6h16M4 12h16M4 18h10" />
            </Icon>
            Modules
          </Link>
        </li>
        <li>
          <Link to="/assessments" className="nav-item" aria-current={pathname === '/assessments' ? 'page' : undefined}>
            <Icon>
              <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
              <path d="M14 3v5h5M9 13h6M9 17h4" />
            </Icon>
            Assessments
          </Link>
        </li>
      </ul>

      <div
        id="sidebar-more"
        className="sidebar-more"
        onKeyDown={(e) => {
          if (e.key === 'Escape') setMenuOpenOn(null)
        }}
      >
        {modules.data && modules.data.length > 0 && (
          <section aria-labelledby="side-modules-heading">
            <h2 id="side-modules-heading" className="side-heading">
              Your modules
            </h2>
            <ul className="side-modules">
              {modules.data.map((m) => {
                if (m.week_count === 0) {
                  return (
                    <li key={m.key}>
                      <span className="side-module is-coming-soon">
                        <span className="side-module-top">
                          <span>{m.code}</span>
                          <span className="soon">Soon</span>
                        </span>
                        <span className="side-module-title">{m.title}</span>
                      </span>
                    </li>
                  )
                }
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
                        <CompletionStamp complete={m.task_count > 0 && m.completed_count === m.task_count} size="sm">
                          Complete
                        </CompletionStamp>
                        {pct < 100 && <span aria-hidden="true">{pct}%</span>}
                      </span>
                      <span className="side-module-title">{m.title}</span>
                      {/* The bar and % above are visual only; this gives the link its progress in words. */}
                      {pct < 100 && <span className="sr-only">{`, ${pct}% done`}</span>}
                      <ProgressBar value={pct} label={`${m.code} progress`} size="sm" decorative />
                    </Link>
                  </li>
                )
              })}
            </ul>
          </section>
        )}

        <div className="sidebar-foot">
          <Link to="/settings" className="side-footer-link" aria-current={pathname === '/settings' ? 'page' : undefined}>
            Settings
          </Link>
          <Link to="/disclaimer" className="side-footer-link" aria-current={pathname === '/disclaimer' ? 'page' : undefined}>
            Disclaimer
          </Link>
          {thisWeek.data && <p className="small">{weekFooter(thisWeek.data)}</p>}
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
      </div>
    </nav>
  )
}
