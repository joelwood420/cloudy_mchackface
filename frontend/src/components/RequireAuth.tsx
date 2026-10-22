import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { isUnauthorized } from '../api'
import { useMe } from '../hooks/useMe'
import { ErrorMessage } from './ErrorMessage'
import { IntakeGate } from './IntakeGate'
import { ShellSkeleton } from './Skeleton'

export function RequireAuth() {
  const me = useMe()
  const location = useLocation()
  if (me.isError) {
    if (isUnauthorized(me.error)) return <Navigate to="/welcome" replace state={{ from: location.pathname }} />
    return (
      <main className="page">
        <ErrorMessage error={me.error} onRetry={() => me.refetch()} />
      </main>
    )
  }
  if (me.isPending) {
    return <ShellSkeleton />
  }
  return (
    <IntakeGate me={me.data}>
      <Outlet />
    </IntakeGate>
  )
}
