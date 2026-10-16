import { useId } from 'react'
import type { Assessment } from '../api'
import { formatDueDate, statusChip } from '../format'
import { ExternalLink } from './ExternalLink'

export function AssessmentsRail({
  code,
  assessments,
  portalUrl,
  onToggleSubmitted,
  emptyText = 'No assessments listed.',
  heading = 'Assessments',
}: {
  assessments: (Assessment & { module_code?: string })[]
  code?: string
  portalUrl: string | null
  onToggleSubmitted: (key: string, submitted: boolean) => void
  emptyText?: string
  heading?: string
}) {
  const headingId = useId()
  return (
    <aside className="rail" aria-labelledby={headingId}>
      <h2 id={headingId}>{heading}</h2>
      {assessments.length === 0 ? (
        <p className="muted">{emptyText}</p>
      ) : (
        <ul className="rail-list">
          {assessments.map((a) => {
            const chip = statusChip(a)
            const titleId = `assessment-${a.key}-title`
            return (
              <li key={a.key} className="card assessment-card">
                <span className="mono small muted">{a.module_code ?? code}</span>
                <h3 id={titleId} className="assessment-title">{a.title}</h3>
                <div className="assessment-foot">
                  <span className="muted small">
                    {a.due_date ? `Due ${formatDueDate(a.due_date)}` : 'Due date: see programme guide'}
                  </span>
                  {chip && <span className={`status-chip ${chip.tone}`.trim()}>{chip.label}</span>}
                </div>
                <label className="submitted-toggle">
                  <input type="checkbox" checked={a.submitted} onChange={() => onToggleSubmitted(a.key, !a.submitted)} aria-describedby={titleId} />
                  Mark submitted
                </label>
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
