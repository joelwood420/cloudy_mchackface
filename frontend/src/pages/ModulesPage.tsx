import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { fetchModules } from '../api'
import { ErrorMessage } from '../components/ErrorMessage'

export function ModulesPage() {
  const query = useQuery({ queryKey: ['modules'], queryFn: fetchModules })

  if (query.isPending) return <p>Loading…</p>
  if (query.isError) return <ErrorMessage error={query.error} onRetry={() => query.refetch()} />

  return (
    <main>
      <h1>Modules</h1>
      {query.data.length === 0 ? (
        <p>No modules yet. Run the seed loader.</p>
      ) : (
        <ul className="module-list">
          {query.data.map((m) => (
            <li key={m.key}>
              <Link to={`/modules/${m.key}`}>
                <span className="code">{m.code}</span> {m.title}
              </Link>
              <span className="meta">
                {m.week_count} {m.week_count === 1 ? 'week' : 'weeks'} · {m.task_count}{' '}
                {m.task_count === 1 ? 'task' : 'tasks'}
              </span>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
