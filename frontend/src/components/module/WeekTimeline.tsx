import { useState } from 'react'
import type { Task, TaskType, Week } from '../../api'
import { plural } from '../../format'
import { ExternalLink } from '../ExternalLink'
import { ProgressBar } from '../ProgressBar'

const TYPE_LABELS: Record<TaskType, string> = {
  learning_path: 'Learning path',
  lab: 'Lab',
  assessment_step: 'Assessment',
}

export function TaskRow({ task }: { task: Task }) {
  const id = `task-${task.key}`
  return (
    <li className="task-row">
      <input type="checkbox" id={id} disabled title="Ticking arrives with sign-in" />
      <label htmlFor={id} className="task-title">
        {task.title}
      </label>
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
        <h3 className="week-heading">
          <button type="button" className="week-toggle" aria-expanded={open} aria-controls={panelId} onClick={onToggle}>
            <span className="week-label">
              <span className="mono small muted">Week {week.week_number}</span>
              <span className="week-title">{week.title}</span>
            </span>
            <span className="week-meta">
              <span className="small muted">{plural(week.tasks.length, 'task')}</span>
              <ProgressBar value={0} label={`Week ${week.week_number} progress`} size="sm" />
            </span>
            <svg className="chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
        </h3>
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

export function WeekTimeline({ weeks }: { weeks: Week[] }) {
  const [openKey, setOpenKey] = useState<string | null>(null)
  return (
    <section className="timeline" aria-labelledby="timeline-heading">
      <div className="section-head">
        <h2 id="timeline-heading">Weekly timeline</h2>
        <span className="small muted">Select a week to see its tasks</span>
      </div>
      {weeks.length === 0 ? (
        <p className="muted">No weeks listed yet.</p>
      ) : (
        <ol className="timeline-list">
          {weeks.map((week, i) => (
            <WeekCard
              key={week.key}
              week={week}
              open={openKey === week.key}
              isLast={i === weeks.length - 1}
              onToggle={() => setOpenKey(openKey === week.key ? null : week.key)}
            />
          ))}
        </ol>
      )}
    </section>
  )
}
