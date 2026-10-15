import { useState } from 'react'
import type { Submodule, Task, TaskType, Week } from '../../api'
import { plural, weekRange } from '../../format'
import { ExternalLink } from '../ExternalLink'
import { ProgressBar } from '../ProgressBar'
import { PrerequisiteBox } from './PrerequisiteBox'

const TYPE_LABELS: Record<TaskType, string> = {
  learning_path: 'Learning path',
  lab: 'Lab',
  assessment_step: 'Assessment',
}

export function TaskRow({ task }: { task: Task }) {
  const id = `task-${task.key}`
  return (
    <li className="task-row">
      <input type="checkbox" id={id} disabled title="Ticking arrives with sign-in" aria-describedby={task.note ? `${id}-note` : undefined} />
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
      </span>
      <span className="tag">{TYPE_LABELS[task.type]}</span>
      <span className="task-links">
        {task.external_url && <ExternalLink href={task.external_url}>Open</ExternalLink>}
        {task.uplearn_url && <ExternalLink href={task.uplearn_url}>UPLearn</ExternalLink>}
      </span>
    </li>
  )
}

export function WeekCard({
  week,
  open,
  isLast,
  onToggle,
}: {
  week: Week
  open: boolean
  isLast: boolean
  onToggle: () => void
}) {
  const panelId = `week-panel-${week.key}`
  return (
    <li className="timeline-item">
      <div className="timeline-rail" aria-hidden="true">
        {!isLast && <span className="timeline-line" />}
        <span className="timeline-dot">{week.week_number}</span>
      </div>
      <div className={`card week-card${open ? ' is-open' : ''}`}>
        <h4 className="week-heading">
          <button type="button" className="week-toggle" aria-expanded={open} aria-controls={panelId} onClick={onToggle}>
            <span className="week-label">
              <span className="mono small muted">Week {week.week_number}</span>
              <span className="week-title">{week.title}</span>
            </span>
            <span className="week-meta">
              <span className="small muted">{plural(week.tasks.length, 'task')}</span>
              <ProgressBar value={0} label={`Week ${week.week_number} progress`} size="sm" decorative />
            </span>
            <svg className="chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
        </h4>
        {open && (
          <div id={panelId} className="week-panel">
            {week.tasks.length === 0 ? (
              <p className="muted">No tasks listed for this week.</p>
            ) : (
              <ul className="task-list">
                {week.tasks.map((task) => (
                  <TaskRow key={task.key} task={task} />
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
        <ExternalLink href={submodule.uplearn_url} label={`${submodule.code} on UPLearn`}>
          UPLearn
        </ExternalLink>
      )}
    </header>
  )
}

export function WeekTimeline({ weeks, submodules }: { weeks: Week[]; submodules: Submodule[] }) {
  const [openKey, setOpenKey] = useState<string | null>(null)
  const toggle = (key: string) => setOpenKey(openKey === key ? null : key)
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
            {group.submodule && <PrerequisiteBox submodule={group.submodule} />}
            {group.weeks.length > 0 && (
              <ol className="timeline-list">
                {group.weeks.map((week, i) => (
                  <WeekCard
                    key={week.key}
                    week={week}
                    open={openKey === week.key}
                    isLast={i === group.weeks.length - 1}
                    onToggle={() => toggle(week.key)}
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
