import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { ApiError, fetchModule } from '../api'
import { AssessmentsRail } from '../components/AssessmentsRail'
import { ErrorMessage } from '../components/ErrorMessage'
import { ModuleHeader } from '../components/module/ModuleHeader'
import { ProgressCard } from '../components/module/ProgressCard'
import { WeekTimeline } from '../components/module/WeekTimeline'

export function ModulePage() {
  const { key = '' } = useParams()
  const query = useQuery({ queryKey: ['module', key], queryFn: () => fetchModule(key) })

  if (query.isPending) {
    return (
      <main className="page">
        <p className="muted">Loading…</p>
      </main>
    )
  }
  if (query.isError) {
    if (query.error instanceof ApiError && query.error.status === 404) {
      return (
        <main className="page">
          <h1>Module not found</h1>
          <Link to="/">Back to modules</Link>
        </main>
      )
    }
    return (
      <main className="page">
        <ErrorMessage error={query.error} onRetry={() => query.refetch()} />
      </main>
    )
  }

  const mod = query.data
  const taskCount = mod.weeks.reduce((sum, w) => sum + w.tasks.length, 0)
  return (
    <main className="page">
      <ModuleHeader code={mod.code} title={mod.title} weeks={mod.weeks} />
      <ProgressCard taskCount={taskCount} weekCount={mod.weeks.length} />
      <div className="module-columns">
        <WeekTimeline key={mod.key} weeks={mod.weeks} />
        <AssessmentsRail code={mod.code} assessments={mod.assessments} portalUrl={mod.uplearn_url} />
      </div>
    </main>
  )
}
