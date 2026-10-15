import { Link } from 'react-router-dom'
import type { Week } from '../../api'
import { weekSummary } from '../../format'

export function ModuleHeader({ code, title, weeks }: { code: string; title: string; weeks: Week[] }) {
  const taskCount = weeks.reduce((sum, w) => sum + w.tasks.length, 0)
  return (
    <header className="page-header">
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <ol>
          <li>
            <Link to="/">Modules</Link>
          </li>
          <li aria-current="page">{code}</li>
        </ol>
      </nav>
      <h1>{title}</h1>
      <p className="muted">{weekSummary(weeks.map((w) => w.week_number), taskCount)}</p>
    </header>
  )
}
