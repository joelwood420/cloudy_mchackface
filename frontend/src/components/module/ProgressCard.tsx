import { ProgressBar } from '../ProgressBar'

export function ProgressCard({ taskCount, weekCount }: { taskCount: number; weekCount: number }) {
  return (
    <section className="card progress-card" aria-labelledby="progress-heading">
      <div className="progress-main">
        <div className="progress-head">
          <h2 id="progress-heading">Module progress</h2>
          <span className="big-number">0%</span>
        </div>
        <ProgressBar value={0} label="Module progress" size="lg" />
        <p className="muted small">Progress tracking arrives with sign-in.</p>
      </div>
      <dl className="stats">
        <div>
          <dt>Tasks done</dt>
          <dd>
            0<span className="of">/{taskCount}</span>
          </dd>
        </div>
        <div>
          <dt>Weeks complete</dt>
          <dd>
            0<span className="of">/{weekCount}</span>
          </dd>
        </div>
      </dl>
    </section>
  )
}
