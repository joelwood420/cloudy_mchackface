import type { ThisWeekGroup } from '../../api'
import { ExternalLink } from '../ExternalLink'
import { PrerequisiteBox } from '../module/PrerequisiteBox'
import { TaskRow } from '../module/WeekTimeline'

export function WeekGroups({
  groups,
  onToggleTask,
  onTogglePrerequisite,
}: {
  groups: ThisWeekGroup[]
  onToggleTask: (taskKey: string, done: boolean) => void
  onTogglePrerequisite: (prerequisiteKey: string, completed: boolean) => void
}) {
  return (
    <>
      {groups.map((g) => (
        <section key={g.week.key} className="card week-group" aria-labelledby={`group-${g.week.key}`}>
          <header className="submodule-head">
            <h3 id={`group-${g.week.key}`}>
              <span className="mono">{g.submodule.code}</span> · {g.submodule.title}
            </h3>
            <span className="small muted">{g.week.title}</span>
            {g.submodule.uplearn_url && (
              <ExternalLink href={g.submodule.uplearn_url} label={`${g.submodule.code} on UPLearn`}>UPLearn</ExternalLink>
            )}
          </header>
          <PrerequisiteBox
            submodule={{ ...g.submodule, first_week: null, last_week: null, prerequisites: g.prerequisites }}
            onToggle={onTogglePrerequisite}
          />
          {g.week.tasks.length === 0 ? (
            <p className="muted">No tasks listed for this week.</p>
          ) : (
            <ul className="task-list">
              {g.week.tasks.map((t) => <TaskRow key={t.key} task={t} onToggle={onToggleTask} />)}
            </ul>
          )}
        </section>
      ))}
    </>
  )
}
