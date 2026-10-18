import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ApiError, type Assessment, fetchModule } from '../api'
import { AssessmentsRail } from '../components/AssessmentsRail'
import { ErrorMessage } from '../components/ErrorMessage'
import { ModuleSkeleton } from '../components/Skeleton'
import { ModuleHeader } from '../components/module/ModuleHeader'
import { ProgressCard } from '../components/module/ProgressCard'
import { WeekTimeline } from '../components/module/WeekTimeline'
import { statusChip } from '../format'
import { useRestoreScroll } from '../hooks/useRestoreScroll'
import { useThisWeek } from '../hooks/useThisWeek'
import { useSubmitAssessment } from '../hooks/useSubmitAssessment'
import { useTickPrerequisite, useTickTask } from '../hooks/useTickTask'
import { moduleProgress } from '../progress'
import { usePageTitle } from '../usePageTitle'

/** The soonest assessment still to submit that has a date. */
function nextDue(assessments: Assessment[]): Assessment | null {
  const open = assessments.filter((a) => !a.submitted && a.days_until !== null)
  return open.sort((a, b) => a.days_until! - b.days_until!)[0] ?? null
}

/** Shown only when the assessments rail has wrapped below the timeline (see .next-due in index.css). */
function NextDue({ assessment }: { assessment: Assessment }) {
  const chip = statusChip(assessment)
  return (
    <p className="next-due">
      <span className="next-due-meta">
        <span className="next-due-label">Next due</span>
        {chip && <span className={`status-chip ${chip.tone}`.trim()}>{chip.label}</span>}
      </span>
      <a href="#module-assessments" className="next-due-title">{assessment.title}</a>
    </p>
  )
}

export function ModulePage() {
  const { key = '' } = useParams()
  const query = useQuery({ queryKey: ['module', key], queryFn: () => fetchModule(key) })
  const thisWeek = useThisWeek()
  const tick = useTickTask(key)
  const prereqTick = useTickPrerequisite(key)
  const submit = useSubmitAssessment()
  const [jumpRequest, setJumpRequest] = useState(0)
  // Module keys are the lower-case code, so the tab says which module is loading before the title arrives.
  usePageTitle(query.data ? `${query.data.code} ${query.data.title}` : key.toUpperCase())
  useRestoreScroll(`/modules/${key}`, query.isSuccess)

  if (query.isPending) return <ModuleSkeleton />
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
  const currentWeek = thisWeek.data?.status === 'teaching' ? (thisWeek.data.week?.week_number ?? null) : null
  const hasCurrent = currentWeek !== null && mod.weeks.some((w) => w.week_number === currentWeek)
  const due = nextDue(mod.assessments)
  return (
    <main className="page module-page">
      <ModuleHeader code={mod.code} title={mod.title} weeks={mod.weeks}>
        {(hasCurrent || due) && (
          <div className="module-wayfinding">
            {hasCurrent && (
              <button type="button" className="jump-chip" onClick={() => setJumpRequest(jumpRequest + 1)}>
                <span className="jump-dot" aria-hidden="true" />
                {`Jump to Week ${currentWeek}`}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 5v14M6 13l6 6 6-6" />
                </svg>
              </button>
            )}
            {due && <NextDue assessment={due} />}
          </div>
        )}
      </ModuleHeader>
      <ProgressCard {...moduleProgress(mod)} />
      {(tick.isError || prereqTick.isError || submit.isError) && (
        <p role="alert" className="error">
          Couldn't save that tick. Try again.
        </p>
      )}
      <div className="module-columns">
        <WeekTimeline
          key={mod.key}
          moduleKey={mod.key}
          weeks={mod.weeks}
          submodules={mod.submodules}
          currentWeek={currentWeek}
          jumpRequest={jumpRequest}
          onToggleTask={(taskKey, done) => tick.mutate({ taskKey, done })}
          onTogglePrerequisite={(prerequisiteKey, completed) => prereqTick.mutate({ prerequisiteKey, completed })}
        />
        <AssessmentsRail
          id="module-assessments"
          code={mod.code}
          assessments={mod.assessments}
          portalUrl={mod.uplearn_url}
          onToggleSubmitted={(assessmentKey, submitted) => submit.mutate({ key: assessmentKey, submitted })}
        />
      </div>
    </main>
  )
}
