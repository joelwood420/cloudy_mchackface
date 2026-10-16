import type { Assessment } from '../api'
import { countdownLabel, countdownTone, daysUntil, formatDueDate } from '../format'
import { ExternalLink } from './ExternalLink'

export function AssessmentsRail({
  code,
  assessments,
  portalUrl,
  today = new Date(),
}: {
  code: string
  assessments: Assessment[]
  portalUrl: string | null
  today?: Date
}) {
  return (
    <aside className="rail" aria-labelledby="assessments-heading">
      <h2 id="assessments-heading">Assessments</h2>
      {assessments.length === 0 ? (
        <p className="muted">No assessments listed.</p>
      ) : (
        <ul className="rail-list">
          {assessments.map((a) => {
            const days = a.due_date ? daysUntil(a.due_date, today) : null
            return (
              <li key={a.key} className="card assessment-card">
                <span className="mono small muted">{code}</span>
                <h3 className="assessment-title">{a.title}</h3>
                <div className="assessment-foot">
                  <span className="muted small">
                    {a.due_date ? `Due ${formatDueDate(a.due_date)}` : 'Due date: see programme guide'}
                  </span>
                  {days !== null && <span className={`countdown ${countdownTone(days)}`.trim()}>{countdownLabel(days)}</span>}
                </div>
                {a.uplearn_url && (
                  <span className="task-links">
                    <ExternalLink href={a.uplearn_url} label={`${a.title} on UPLearn`}>UPLearn</ExternalLink>
                  </span>
                )}
              </li>
            )
          })}
        </ul>
      )}
      {portalUrl && (
        <a className="button-secondary" href={portalUrl} target="_blank" rel="noopener noreferrer">
          Open in Yoobee portal
        </a>
      )}
    </aside>
  )
}
