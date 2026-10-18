import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { type ModuleSummary, fetchModules } from '../api'
import { ErrorMessage } from '../components/ErrorMessage'
import { ProgressBar } from '../components/ProgressBar'
import { ListSkeleton } from '../components/Skeleton'
import { plural } from '../format'
import { percent, programmeProgress } from '../progress'
import { usePageTitle } from '../usePageTitle'

function ProgrammeProgress({ modules }: { modules: ModuleSummary[] }) {
  const { done, total, pct } = programmeProgress(modules)
  return (
    <section className="card progress-card" aria-labelledby="programme-heading">
      <div className="progress-main">
        <div className="progress-head">
          <h2 id="programme-heading">Programme progress</h2>
          <span className="big-number">{pct}%</span>
        </div>
        <ProgressBar value={pct} label="Programme progress" valueText={`${done} of ${total} tasks done`} size="lg" />
        <p className="muted small">
          {done} of {plural(total, 'task')} done
        </p>
      </div>
    </section>
  )
}

export function ModulesPage() {
  usePageTitle('Modules')
  const query = useQuery({ queryKey: ['modules'], queryFn: fetchModules })

  if (query.isPending) return <ListSkeleton label="Loading modules…" />
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
      {query.data.length > 0 && <ProgrammeProgress modules={query.data} />}
      {query.data.length === 0 ? (
        <p className="muted">No modules are loaded yet.</p>
      ) : (
        <ul className="card-grid">
          {query.data.map((m) =>
            m.week_count === 0 ? (
              <li key={m.key} className="card module-card is-coming-soon">
                <span className="mono small muted">{m.code}</span>
                <span className="module-card-title">{m.title}</span>
                <span className="soon">Coming soon</span>
              </li>
            ) : (
              <li key={m.key} className="card module-card">
                <Link to={`/modules/${m.key}`}>
                  <span className="mono small muted">{m.code}</span>
                  <span className="module-card-title">{m.title}</span>
                </Link>
                <span className="muted small">
                  {plural(m.week_count, 'week')} · {plural(m.task_count, 'task')}
                </span>
                <ProgressBar
                  value={percent(m.completed_count, m.task_count)}
                  label={`${m.code} progress`}
                  valueText={`${m.completed_count} of ${m.task_count} tasks done`}
                />
              </li>
            ),
          )}
        </ul>
      )}
    </main>
  )
}
