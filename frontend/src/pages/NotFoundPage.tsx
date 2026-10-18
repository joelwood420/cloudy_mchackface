import { Link, useLocation } from 'react-router-dom'
import { usePageTitle } from '../usePageTitle'

export function NotFoundPage() {
  usePageTitle('Page not found')
  const { pathname } = useLocation()
  return (
    <main className="page not-found">
      <h1>Page not found</h1>
      <p className="muted">
        You've wandered off the map. <span className="mono not-found-ref">{pathname}</span> isn't in the guide, but your week is.
      </p>
      <div className="gate-actions">
        <Link to="/" className="button-primary">Back to this week</Link>
        <Link to="/modules" className="button-secondary">All modules</Link>
      </div>
    </main>
  )
}
