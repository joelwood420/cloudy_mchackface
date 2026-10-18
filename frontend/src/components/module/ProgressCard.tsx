import { ProgressBar } from '../ProgressBar'
import { CompletionStamp } from '../Stamp'

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
        <ProgressBar value={pct} label="Module progress" valueText={`${done} of ${total} tasks done`} size="lg" />
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
      <CompletionStamp complete={total > 0 && done === total} size="md" slot>
        Module complete
      </CompletionStamp>
    </section>
  )
}
