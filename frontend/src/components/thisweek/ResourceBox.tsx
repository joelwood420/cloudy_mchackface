import { useId } from 'react'
import { Link } from 'react-router-dom'
import type { ResourceBox as Box } from '../../api'
import { resourceBoxHeading } from '../../resources'
import { ResourceColumns } from '../ResourceColumns'

/** The links for the assessment tasks in this week's slot. Submitting links live on the assessment card instead. */
export function ResourceBox({ box }: { box: Box }) {
  const headingId = useId()
  return (
    <section className="resource-box" aria-labelledby={headingId}>
      <h4 id={headingId} className="resource-box-title">{resourceBoxHeading(box.assessment_short, box.task_numbers)}</h4>
      <ResourceColumns resources={box.resources} groups={['recording', 'code_data', 'tool']} />
      <Link className="resource-box-all small" to={`/assessments#${box.assessment_key}`}>
        All {box.assessment_short} resources →
      </Link>
    </section>
  )
}
