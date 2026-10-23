import { useId } from 'react'
import { Link } from 'react-router-dom'
import type { ResourceBox as Box } from '../../api'
import { ResourceColumns } from '../ResourceColumns'

function list(numbers: number[]): string {
  return numbers.length === 1 ? `${numbers[0]}` : `${numbers.slice(0, -1).join(', ')} and ${numbers[numbers.length - 1]}`
}

export function resourceBoxHeading(short: string, numbers: number[]): string {
  if (numbers.length === 0) return `What you need for ${short}`
  return `What you need for ${short} ${numbers.length === 1 ? 'Task' : 'Tasks'} ${list(numbers)}`
}

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
