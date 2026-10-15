import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { ApiError, fetchModule, type TaskType } from '../api'
import { ErrorMessage } from '../components/ErrorMessage'

const TYPE_LABELS: Record<TaskType, string> = {
  learning_path: 'Learning path',
  lab: 'Lab',
  assessment_step: 'Assessment',
}

/** Format a YYYY-MM-DD date in local time so it never shifts a day. */
export function formatDueDate(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('en-NZ', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function ExternalLink({ href, children }: { href: string; children: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  )
}

export function ModulePage() {
  const { key = '' } = useParams()
  const query = useQuery({ queryKey: ['module', key], queryFn: () => fetchModule(key) })

  if (query.isPending) return <p>Loading…</p>
  if (query.isError) {
    if (query.error instanceof ApiError && query.error.status === 404) {
      return (
        <main>
          <h1>Module not found</h1>
          <Link to="/">Back to modules</Link>
        </main>
      )
    }
    return <ErrorMessage error={query.error} onRetry={() => query.refetch()} />
  }

  const mod = query.data
  return (
    <main>
      <Link to="/">← All modules</Link>
      <h1>
        {mod.code}: {mod.title}
      </h1>

      <section>
        <h2>Weeks</h2>
        {mod.weeks.map((week) => (
          <details key={week.key}>
            <summary>
              Week {week.week_number}: {week.title}
            </summary>
            <p className="meta">{week.tasks.length} tasks</p>
            {week.tasks.length === 0 ? (
              <p>No tasks listed for this week.</p>
            ) : (
              <ul className="task-list">
                {week.tasks.map((task) => (
                  <li key={task.key}>
                    <span>{task.title}</span>
                    <span className="task-type">{TYPE_LABELS[task.type]}</span>
                    {task.external_url && <ExternalLink href={task.external_url}>Open</ExternalLink>}
                    {task.uplearn_url && <ExternalLink href={task.uplearn_url}>UPLearn</ExternalLink>}
                  </li>
                ))}
              </ul>
            )}
          </details>
        ))}
      </section>

      <section>
        <h2>Assessments</h2>
        <ul className="task-list">
          {mod.assessments.map((a) => (
            <li key={a.key}>
              <span>{a.title}</span>
              <span className="meta">
                {a.due_date ? `Due ${formatDueDate(a.due_date)}` : 'Due date: see programme guide'}
              </span>
              {a.uplearn_url && <ExternalLink href={a.uplearn_url}>UPLearn</ExternalLink>}
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
