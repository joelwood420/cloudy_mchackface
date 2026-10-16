import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { ApiError, fetchModule } from '../api'
import { AssessmentsRail } from '../components/AssessmentsRail'
import { ErrorMessage } from '../components/ErrorMessage'
import { ModuleHeader } from '../components/module/ModuleHeader'
import { ProgressCard } from '../components/module/ProgressCard'
import { WeekTimeline } from '../components/module/WeekTimeline'
import { useThisWeek } from '../hooks/useThisWeek'
import { useTickPrerequisite, useTickTask } from '../hooks/useTickTask'
import { moduleProgress } from '../progress'
import { usePageTitle } from '../usePageTitle'

export function ModulePage() {
  const { key = '' } = useParams()
  const query = useQuery({ queryKey: ['module', key], queryFn: () => fetchModule(key) })
  const thisWeek = useThisWeek()
  const tick = useTickTask(key)
  const prereqTick = useTickPrerequisite(key)
  usePageTitle(query.data ? `${query.data.code} ${query.data.title}` : 'Module')

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
          <Link to="/modules" className="back-link">Back to modules</Link>
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
  return (
    <main className="page">
      <ModuleHeader code={mod.code} title={mod.title} weeks={mod.weeks} />
      <ProgressCard {...moduleProgress(mod)} />
      {(tick.isError || prereqTick.isError) && (
        <p role="alert" className="error">
          Couldn't save that tick. Try again.
        </p>
      )}
      <div className="module-columns">
        <WeekTimeline
          key={mod.key}
          weeks={mod.weeks}
          submodules={mod.submodules}
          currentWeek={thisWeek.data?.status === 'teaching' ? (thisWeek.data.week?.week_number ?? null) : null}
          onToggleTask={(taskKey, done) => tick.mutate({ taskKey, done })}
          onTogglePrerequisite={(prerequisiteKey, completed) => prereqTick.mutate({ prerequisiteKey, completed })}
        />
        <AssessmentsRail code={mod.code} assessments={mod.assessments} portalUrl={mod.uplearn_url} />
      </div>
    </main>
  )
}
