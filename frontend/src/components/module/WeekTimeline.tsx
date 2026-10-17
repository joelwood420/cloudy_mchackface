import { useState } from 'react'
import type { Submodule, Task, TaskType, Week } from '../../api'
import { weekRange } from '../../format'
import { percent, weekDone } from '../../progress'
import { uplearnLabel, uplearnName, uplearnTrackName } from '../../uplearn'
import { ExternalLink } from '../ExternalLink'
import { ProgressBar } from '../ProgressBar'
import { PrerequisiteBox } from './PrerequisiteBox'

const TYPE_LABELS: Record<TaskType, string> = {
  learning_path: 'Learning path',
  lab: 'Lab',
  assessment_step: 'Assessment',
}

/** The track a task sits in, so its UPLearn link can be dropped when it only repeats the track's own link. */
export interface TrackRef {
  code: string
  uplearn_url: string | null
}

/** A week's schedule post, which is where tutors put lab access details. */
export interface SchedulePostRef {
  weekNumber: number
  url: string
}

export function TaskRow({
  task,
  onToggle,
  track,
  schedulePost,
}: {
  task: Task
  onToggle: (taskKey: string, done: boolean) => void
  track?: TrackRef
  schedulePost?: SchedulePostRef | null
}) {
  const id = `task-${task.key}`
  const uplearn = task.uplearn_url && task.uplearn_url !== track?.uplearn_url ? task.uplearn_url : null
  const uplearnText = uplearn ? uplearnLabel(uplearn, track?.code) : ''
  return (
    <li className="task-row">
      <input
        type="checkbox"
        id={id}
        checked={task.done}
        onChange={() => onToggle(task.key, !task.done)}
        aria-describedby={task.note ? `${id}-note` : undefined}
      />
      <span className="task-main">
        <label htmlFor={id} className="task-title">
          {task.title}
        </label>
        {task.note && (
          <span id={`${id}-note`} className="task-note">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 11v5M12 8h.01" />
            </svg>
            {task.note}
          </span>
        )}
        {task.type === 'lab' && schedulePost && (
          <span className="task-note">
            <span>
              Lab access details are in the{' '}
              <ExternalLink href={schedulePost.url}>{`Week ${schedulePost.weekNumber} schedule post`}</ExternalLink>.
            </span>
          </span>
        )}
      </span>
      <span className="tag">{TYPE_LABELS[task.type]}</span>
      <span className="task-links">
        {task.external_url && <ExternalLink href={task.external_url} label={`Open ${task.title}`}>Open</ExternalLink>}
        {uplearn && (
          <ExternalLink href={uplearn} label={uplearnName(uplearnText, task.title)}>
            {uplearnText}
          </ExternalLink>
        )}
      </span>
    </li>
  )
}

export function WeekCard({
  week,
  open,
  isLast,
  isCurrent,
  onToggle,
  onToggleTask,
  track,
}: {
  week: Week
  open: boolean
  isCurrent: boolean
  isLast: boolean
  onToggle: () => void
  onToggleTask: (taskKey: string, done: boolean) => void
  track?: TrackRef
}) {
  const panelId = `week-panel-${week.key}`
  const post = week.schedule_post_url ? { weekNumber: week.week_number, url: week.schedule_post_url } : null
  return (
    <li className="timeline-item">
      <div className="timeline-rail" aria-hidden="true">
        {!isLast && <span className="timeline-line" />}
        <span className={`timeline-dot${isCurrent ? ' is-current' : ''}`}>{week.week_number}</span>
      </div>
      <div className={`card week-card${open ? ' is-open' : ''}`}>
        <h4 className="week-heading">
          <button type="button" className="week-toggle" aria-expanded={open} aria-controls={panelId} onClick={onToggle}>
            <span className="week-label">
              <span className="mono small muted">Week {week.week_number}</span>
              {isCurrent && <span className="current-badge">Current week</span>}
              <span className="week-title">{week.title}</span>
            </span>
            <span className="week-meta">
              <span className="small muted">
                {week.tasks.length === 0 ? 'No tasks' : `${weekDone(week)}/${week.tasks.length} done`}
              </span>
              <ProgressBar value={percent(weekDone(week), week.tasks.length)} label={`Week ${week.week_number} progress`} size="sm" decorative />
            </span>
            <svg className="chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
        </h4>
        {open && (
          <div id={panelId} className="week-panel">
            {post && (
              <p className="week-post">
                <ExternalLink href={post.url}>{`Week ${post.weekNumber} schedule post`}</ExternalLink>
              </p>
            )}
            {week.tasks.length === 0 ? (
              <p className="muted">No tasks listed for this week.</p>
            ) : (
              <ul className="task-list">
                {week.tasks.map((task) => (
                  <TaskRow key={task.key} task={task} onToggle={onToggleTask} track={track} schedulePost={post} />
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </li>
  )
}

interface WeekGroup {
  submodule: Submodule | null
  weeks: Week[]
}

/** Weeks grouped by submodule, in submodule order. Weeks with an unknown submodule go in a last, unnamed group. */
function groupWeeks(weeks: Week[], submodules: Submodule[]): WeekGroup[] {
  const known = new Set(submodules.map((s) => s.key))
  const groups: WeekGroup[] = submodules.map((s) => ({ submodule: s, weeks: weeks.filter((w) => w.submodule_key === s.key) }))
  const orphans = weeks.filter((w) => !known.has(w.submodule_key))
  if (orphans.length > 0) groups.push({ submodule: null, weeks: orphans })
  return groups
}

function SubmoduleHead({ submodule }: { submodule: Submodule }) {
  const { first_week: first, last_week: last } = submodule
  return (
    <header className="submodule-head">
      <h3 id={`submodule-${submodule.key}`}>
        <span className="mono">{submodule.code}</span> · {submodule.title}
      </h3>
      {first !== null && last !== null && <span className="small muted">{weekRange(first, last)}</span>}
      {submodule.uplearn_url && (
        <ExternalLink href={submodule.uplearn_url} label={uplearnTrackName(submodule.uplearn_url, submodule.code)}>
          {uplearnLabel(submodule.uplearn_url, submodule.code)}
        </ExternalLink>
      )}
    </header>
  )
}

export function WeekTimeline({
  weeks,
  submodules,
  currentWeek,
  onToggleTask,
  onTogglePrerequisite,
}: {
  weeks: Week[]
  submodules: Submodule[]
  currentWeek: number | null
  onToggleTask: (taskKey: string, done: boolean) => void
  onTogglePrerequisite: (prerequisiteKey: string, completed: boolean) => void
}) {
  // Until the user opens or closes a week, the current week is open. It may only be known after this-week loads.
  const [choice, setChoice] = useState<{ key: string | null } | null>(null)
  const openKey = choice ? choice.key : (weeks.find((w) => w.week_number === currentWeek)?.key ?? null)
  const toggle = (key: string) => setChoice({ key: openKey === key ? null : key })
  return (
    <section className="timeline" aria-labelledby="timeline-heading">
      <div className="section-head">
        <h2 id="timeline-heading">Weekly timeline</h2>
        <span className="small muted">Select a week to see its tasks</span>
      </div>
      {weeks.length === 0 && submodules.length === 0 ? (
        <p className="muted">No weeks listed yet.</p>
      ) : (
        groupWeeks(weeks, submodules).map((group) => (
          <section
            key={group.submodule?.key ?? 'other'}
            className="submodule"
            aria-labelledby={group.submodule ? `submodule-${group.submodule.key}` : undefined}
          >
            {group.submodule && <SubmoduleHead submodule={group.submodule} />}
            {group.submodule && <PrerequisiteBox submodule={group.submodule} onToggle={onTogglePrerequisite} />}
            {group.weeks.length > 0 && (
              <ol className="timeline-list">
                {group.weeks.map((week, i) => (
                  <WeekCard
                    key={week.key}
                    week={week}
                    open={openKey === week.key}
                    isLast={i === group.weeks.length - 1}
                    isCurrent={week.week_number === currentWeek}
                    onToggle={() => toggle(week.key)}
                    onToggleTask={onToggleTask}
                    track={group.submodule ?? undefined}
                  />
                ))}
              </ol>
            )}
          </section>
        ))
      )}
    </section>
  )
}
