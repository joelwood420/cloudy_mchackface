import { useLocation, useNavigate } from 'react-router-dom'
import { type ThisWeek } from '../api'
import { AssessmentsRail } from '../components/AssessmentsRail'
import { ErrorMessage } from '../components/ErrorMessage'
import { ExternalLink } from '../components/ExternalLink'
import { ProgressBar } from '../components/ProgressBar'
import { AheadPrompt } from '../components/thisweek/AheadPrompt'
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

/** One schedule post link per module teaching this week, in module order. */
function schedulePosts(tw: ThisWeek): { moduleCode: string; weekNumber: number; url: string }[] {
  const seen = new Map<string, { moduleCode: string; weekNumber: number; url: string }>()
  for (const g of tw.groups) {
    if (g.week.schedule_post_url && !seen.has(g.module_key)) {
      seen.set(g.module_key, { moduleCode: g.module_code, weekNumber: g.week.week_number, url: g.week.schedule_post_url })
    }
  }
  return [...seen.values()]
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
  const posts = schedulePosts(tw)
  return (
    <header className="page-header">
      <h1>{tw.week ? `Week ${tw.week.week_number}` : 'This week'}</h1>
      <p className="muted">{modules ? `${dates} · ${modules}` : dates}</p>
      {posts.length > 0 && (
        <p className="week-post-note">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 11v5M12 8h.01" />
          </svg>
          <span>
            Before you start, read the{' '}
            {posts.map((p, i) => {
              const text = posts.length > 1 ? `${p.moduleCode} week ${p.weekNumber} schedule post` : `Week ${p.weekNumber} schedule post`
              return (
                <span key={p.moduleCode}>
                  {i > 0 && (i === posts.length - 1 ? ' and ' : ', ')}
                  <ExternalLink href={p.url} label={`${text} on UPLearn`}>
                    {text}
                  </ExternalLink>
                </span>
              )
            })}{' '}
            on UPLearn. It lists this week's modules, lab access and reminders.
          </span>
        </p>
      )}
      <div className="week-stats">
        <ProgressBar value={percent(done, total)} label="This week's progress" valueText={`${done} of ${total} tasks done`} size="lg" />
        <p className="week-stats-text small">
          <span>
            {done}/{plural(total, 'task')} done
          </span>
          {next_deadline_days !== null && <span>{deadlineText(next_deadline_days)}</span>}
        </p>
      </div>
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
        <p className="muted">Loading this week…</p>
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
          {tw.status === 'teaching' && <h2>Tasks</h2>}
          {tw.status === 'teaching' &&
            (tw.groups.length === 0 ? (
              <p className="muted">
                Content for this week isn't in the app yet.{' '}
                <ExternalLink href="https://yoobee.uplearn.education/" label="Open UPLearn">Open UPLearn</ExternalLink>
              </p>
            ) : (
              <WeekGroups groups={tw.groups} onToggleTask={onToggleTask} onTogglePrerequisite={onTogglePrerequisite} />
            ))}
          <AheadPrompt
            weekNumber={tw.week?.week_number ?? null}
            ahead={tw.ahead}
            onToggleTask={onToggleTask}
            onTogglePrerequisite={onTogglePrerequisite}
          />
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
