import { ProgressBar } from '../ProgressBar'

export function ProgressCard({
  done,
  total,
  pct,
  weeksComplete,
  weeksWithTasks,
}: {
  done: number
  total: number
  pct: number
  weeksComplete: number
  weeksWithTasks: number
}) {
  return (
    <section className="card progress-card" aria-labelledby="progress-heading">
      <div className="progress-main">
        <div className="progress-head">
          <h2 id="progress-heading">Module progress</h2>
          <span className="big-number">{pct}%</span>
        </div>
        <ProgressBar value={pct} label="Module progress" size="lg" />
      </div>
      <dl className="stats">
        <div>
          <dt>Tasks done</dt>
          <dd>
            {done}
            <span className="of">/{total}</span>
          </dd>
        </div>
        <div>
          <dt>Weeks complete</dt>
          <dd>
            {weeksComplete}
            <span className="of">/{weeksWithTasks}</span>
          </dd>
        </div>
      </dl>
    </section>
  )
}
