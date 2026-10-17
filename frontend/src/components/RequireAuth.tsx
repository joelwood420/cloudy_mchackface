import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { isUnauthorized } from '../api'
import { useMe } from '../hooks/useMe'
import { ErrorMessage } from './ErrorMessage'

export function RequireAuth() {
  const me = useMe()
  const location = useLocation()
  if (me.isError) {
    if (isUnauthorized(me.error)) return <Navigate to="/login" replace state={{ from: location.pathname }} />
    return (
      <main className="page">
        <ErrorMessage error={me.error} onRetry={() => me.refetch()} />
      </main>
    )
  }
  if (me.isPending) {
    return (
      <main className="page">
        <p className="muted">Checking you're logged in…</p>
      </main>
    )
  }
  return <Outlet />
}
