import { useState } from 'react'
import type { Prerequisite, Submodule } from '../../api'
import { ExternalLink } from '../ExternalLink'

type Toggle = (prerequisiteKey: string, completed: boolean) => void

function PrerequisiteRow({ submoduleKey, prerequisite: p, onToggle }: { submoduleKey: string; prerequisite: Prerequisite; onToggle: Toggle }) {
  // The same prerequisite can show under several submodules on one page, so the id includes the submodule.
  const id = `prereq-${submoduleKey}-${p.key}`
  return (
    <li className="prereq-item">
      <input
        type="checkbox"
        id={id}
        checked={p.completed}
        onChange={() => onToggle(p.key, !p.completed)}
        aria-describedby={p.note ? `${id}-note` : undefined}
      />
      <span className="task-main">
        <label htmlFor={id} className="prereq-title">
          {p.title}
        </label>
        {p.note && (
          <span id={`${id}-note`} className="task-note">
            {p.note}
          </span>
        )}
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
  )
}

/** One-off setup steps for a submodule. Done ones are hidden (tickable again via "Show done"); never part of progress. */
/** `idScope` keeps ids unique when the same submodule is shown more than once on a page (e.g. this week and next). */
export function PrerequisiteBox({ submodule, onToggle, idScope }: { submodule: Submodule; onToggle: Toggle; idScope?: string }) {
  const [showDone, setShowDone] = useState(false)
  if (submodule.prerequisites.length === 0) return null
  const todo = submodule.prerequisites.filter((p) => !p.completed)
  const done = submodule.prerequisites.filter((p) => p.completed)
  const row = (p: Prerequisite) => <PrerequisiteRow key={p.key} submoduleKey={idScope ? `${idScope}-${submodule.key}` : submodule.key} prerequisite={p} onToggle={onToggle} />
  return (
    <div className={`prereq-box${todo.length === 0 ? ' is-ready' : ''}`}>
      <h4>Before you start</h4>
      {todo.length === 0 ? <p className="prereq-ready">You're ready to start learning.</p> : <ul className="prereq-list">{todo.map(row)}</ul>}
      {done.length > 0 && (
        <>
          <button type="button" className="link-button" aria-expanded={showDone} onClick={() => setShowDone(!showDone)}>
            {showDone ? 'Hide done' : `Show done (${done.length})`}
          </button>
          {showDone && <ul className="prereq-list is-done">{done.map(row)}</ul>}
        </>
      )}
    </div>
  )
}
