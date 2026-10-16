import { useLocation, useNavigate } from 'react-router-dom'
import { type ThisWeek } from '../api'
import { AssessmentsRail } from '../components/AssessmentsRail'
import { ErrorMessage } from '../components/ErrorMessage'
import { ExternalLink } from '../components/ExternalLink'
import { ProgressBar } from '../components/ProgressBar'
import { MalwareBanner } from '../components/thisweek/MalwareBanner'
import { CatchUpNote, HolidayNotes, UpcomingBreakBanner } from '../components/thisweek/Notices'
import { WeekGroups } from '../components/thisweek/WeekGroups'
import { dayDate, plural } from '../format'
import { useSubmitAssessment } from '../hooks/useSubmitAssessment'
import { useThisWeek, useTickThisWeekPrerequisite, useTickThisWeekTask } from '../hooks/useThisWeek'
import { percent } from '../progress'
import { usePageTitle } from '../usePageTitle'

function modulesLine(tw: ThisWeek): string {
  const seen = new Map<string, string>()
  for (const g of tw.groups) if (!seen.has(g.module_key)) seen.set(g.module_key, `${g.module_code} ${g.module_title}`)
  return [...seen.values()].join(', ')
}

function deadlineText(days: number): string {
  return days === 0 ? 'Next deadline today' : `Next deadline in ${plural(days, 'day')}`
}

function StatusHeader({ tw }: { tw: ThisWeek }) {
  if (tw.status === 'break' && tw.current_break) {
    const b = tw.current_break
    return (
      <header className="page-header">
        <h1>You're on break 🌴</h1>
        <p className="muted">
          Until {dayDate(b.ends_on)} (week {b.week_of_break} of {b.length_weeks}).
        </p>
        <p className="muted">Rest up, or use the time to clear anything still lurking.</p>
        {tw.next_week && (
          <p className="muted">
            Week {tw.next_week.week_number} starts {dayDate(tw.next_week.starts_on)}.
          </p>
        )}
      </header>
    )
  }
  if (tw.status === 'before_start') {
    return (
      <header className="page-header">
        <h1>This week</h1>
        <p className="muted">
          {tw.next_week ? `The programme starts ${dayDate(tw.next_week.starts_on)}.` : "The schedule isn't loaded yet."}
        </p>
      </header>
    )
  }
  if (tw.status === 'finished') {
    return (
      <header className="page-header">
        <h1>Programme finished</h1>
        <p className="muted">You've reached the end of the programme.</p>
      </header>
    )
  }
  const { done, total, next_deadline_days } = tw.stats
  const modules = modulesLine(tw)
  const dates = tw.week ? `${dayDate(tw.week.starts_on)} – ${dayDate(tw.week.ends_on)}` : ''
  return (
    <header className="page-header">
      <h1>{tw.week ? `Week ${tw.week.week_number}` : 'This week'}</h1>
      <p className="muted">{modules ? `${dates} · ${modules}` : dates}</p>
      <ProgressBar value={percent(done, total)} label="This week's progress" size="lg" />
      <p className="muted small">
        {done}/{plural(total, 'task')} done
      </p>
      {next_deadline_days !== null && <p className="muted small">{deadlineText(next_deadline_days)}</p>}
    </header>
  )
}

export function ThisWeekPage() {
  usePageTitle('This week')
  const query = useThisWeek()
  const tickTask = useTickThisWeekTask()
  const tickPrereq = useTickThisWeekPrerequisite()
  const submit = useSubmitAssessment()
  const location = useLocation()
  const navigate = useNavigate()
  const catchUp = (location.state as { prefilledThroughWeek?: number } | null)?.prefilledThroughWeek ?? null

  if (query.isPending) {
    return (
      <main className="page">
        <p className="muted">Loading…</p>
      </main>
    )
  }
  if (query.isError) {
    return (
      <main className="page">
        <ErrorMessage error={query.error} onRetry={() => query.refetch()} />
      </main>
    )
  }

  const tw = query.data
  const onToggleTask = (taskKey: string, done: boolean) => tickTask.mutate({ taskKey, done })
  const onTogglePrerequisite = (prerequisiteKey: string, completed: boolean) => tickPrereq.mutate({ prerequisiteKey, completed })
  return (
    <main className="page">
      <StatusHeader tw={tw} />
      {(tickTask.isError || tickPrereq.isError || submit.isError) && (
        <p role="alert" className="error">Couldn't save that tick. Try again.</p>
      )}
      {catchUp !== null && <CatchUpNote throughWeek={catchUp} onDismiss={() => navigate('.', { replace: true, state: null })} />}
      {tw.upcoming_break && <UpcomingBreakBanner upcoming={tw.upcoming_break} />}
      <HolidayNotes holidays={tw.holidays} />
      <MalwareBanner lurking={tw.lurking} onToggleTask={onToggleTask} />
      <div className="module-columns">
        <div className="this-week-main">
          {tw.status === 'teaching' &&
            (tw.groups.length === 0 ? (
              <p className="muted">
                Content for this week isn't in the app yet.{' '}
                <ExternalLink href="https://yoobee.uplearn.education/" label="Open UPLearn">Open UPLearn</ExternalLink>
              </p>
            ) : (
              <WeekGroups groups={tw.groups} onToggleTask={onToggleTask} onTogglePrerequisite={onTogglePrerequisite} />
            ))}
          {tw.ahead && (
            <section aria-labelledby="ahead-heading" className="ahead">
              <h2 id="ahead-heading">You're ahead of schedule 🎉</h2>
              <h3>Next up · Week {tw.ahead.week_number}</h3>
              {tw.ahead.groups.length === 0 ? (
                <p className="muted">Week {tw.ahead.week_number} isn't in the app yet.</p>
              ) : (
                <WeekGroups groups={tw.ahead.groups} onToggleTask={onToggleTask} onTogglePrerequisite={onTogglePrerequisite} />
              )}
            </section>
          )}
        </div>
        <AssessmentsRail
          assessments={tw.assessments}
          portalUrl={null}
          emptyText="No deadlines in the next 4 weeks."
          onToggleSubmitted={(key, submitted) => submit.mutate({ key, submitted })}
        />
      </div>
    </main>
  )
}
