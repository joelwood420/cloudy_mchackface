import type { Submodule } from '../../api'
import { ExternalLink } from '../ExternalLink'

/** One-off setup steps for a submodule. Shown for guidance only; never part of progress. */
export function PrerequisiteBox({ submodule }: { submodule: Submodule }) {
  if (submodule.prerequisites.length === 0) return null
  return (
    <div className="prereq-box">
      <h4>Before you start</h4>
      <ul className="prereq-list">
        {submodule.prerequisites.map((p) => (
          <li key={p.key} className="prereq-item">
            <span className="task-main">
              <span className="prereq-title">{p.title}</span>
              {p.note && <span className="task-note">{p.note}</span>}
            </span>
            <span className="task-links">
              {p.external_url && (
                <ExternalLink href={p.external_url} label={`Do it: ${p.title}`}>
                  Do it
                </ExternalLink>
              )}
              {p.uplearn_url && (
                <ExternalLink href={p.uplearn_url} label={`Watch the guide: ${p.title}`}>
                  Watch the guide
                </ExternalLink>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
