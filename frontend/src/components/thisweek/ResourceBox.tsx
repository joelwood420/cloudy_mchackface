import { useId, useState } from 'react'
import { Link } from 'react-router-dom'
import type { ResourceBox as Box } from '../../api'
import { plural } from '../../format'
import { resourceBoxHeading } from '../../resources'
import { ResourceColumns } from '../ResourceColumns'

/** The links for the assessment tasks in this week's slot, folded until asked for. Submitting links live on the
 * assessment card instead. */
export function ResourceBox({ box }: { box: Box }) {
  const [open, setOpen] = useState(false)
  const headingId = useId()
  const panelId = useId()
  return (
    <section className={`resource-box${open ? ' is-open' : ''}`} aria-labelledby={headingId}>
      <h4 className="resource-box-title">
        <button type="button" className="resource-box-toggle" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen(!open)}>
          <span id={headingId}>{resourceBoxHeading(box.assessment_short, box.task_numbers)}</span>
          <span className="resource-box-count small">{plural(box.resources.length, 'link')}</span>
          <svg className="resource-box-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
      </h4>
      {open && (
        <div id={panelId} className="resource-box-panel">
          <ResourceColumns resources={box.resources} groups={['recording', 'code_data', 'tool']} />
          <Link className="resource-box-all small" to={`/assessments#${box.assessment_key}`}>
            All {box.assessment_short} resources →
          </Link>
        </div>
      )}
    </section>
  )
}
