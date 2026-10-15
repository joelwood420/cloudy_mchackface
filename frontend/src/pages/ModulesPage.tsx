import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { fetchModules } from '../api'
import { ErrorMessage } from '../components/ErrorMessage'
import { ProgressBar } from '../components/ProgressBar'
import { plural } from '../format'

export function ModulesPage() {
  const query = useQuery({ queryKey: ['modules'], queryFn: fetchModules })

  if (query.isPending) {
    return (
      <main className="page">
        <p className="muted">Loading…</p>
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

  return (
    <main className="page">
      <header className="page-header">
        <h1>Modules</h1>
        <p className="muted">Pick a module to see its week-by-week plan.</p>
      </header>
      {query.data.length === 0 ? (
        <p className="muted">No modules yet. Run the seed loader.</p>
      ) : (
        <ul className="card-grid">
          {query.data.map((m) => (
            <li key={m.key} className="card module-card">
              <Link to={`/modules/${m.key}`}>
                <span className="mono small muted">{m.code}</span>
                <span className="module-card-title">{m.title}</span>
              </Link>
              <span className="muted small">
                {plural(m.week_count, 'week')} · {plural(m.task_count, 'task')}
              </span>
              <ProgressBar value={0} label={`${m.code} progress`} />
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
