import type { ThisWeekGroup } from '../../api'
import { useJustReached } from '../../hooks/useJustReached'
import { weekDone } from '../../progress'
import { ExternalLink } from '../ExternalLink'
import { CompletionStamp, LiveNote, SLAM_MS } from '../Stamp'
import { PrerequisiteBox } from '../module/PrerequisiteBox'
import { ResourceBox } from './ResourceBox'
import { TaskRow } from '../module/WeekTimeline'
import { uplearnLabel, uplearnTrackName } from '../../uplearn'

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
        <WeekGroup key={g.week.key} g={g} onToggleTask={onToggleTask} onTogglePrerequisite={onTogglePrerequisite} />
      ))}
    </>
  )
}

function WeekGroup({
  g,
  onToggleTask,
  onTogglePrerequisite,
}: {
  g: ThisWeekGroup
  onToggleTask: (taskKey: string, done: boolean) => void
  onTogglePrerequisite: (prerequisiteKey: string, completed: boolean) => void
}) {
  const complete = g.week.tasks.length > 0 && weekDone(g.week) === g.week.tasks.length
  const justCompleted = useJustReached(complete, SLAM_MS)
  return (
    <section className="card week-group" aria-labelledby={`group-${g.week.key}`}>
      <header className="submodule-head">
        <h3 id={`group-${g.week.key}`}>
          <span className="mono">{g.submodule.code}</span> · {g.submodule.title}
        </h3>
        <span className="small muted">{g.week.title}</span>
        {g.submodule.uplearn_url && (
          <ExternalLink href={g.submodule.uplearn_url} label={uplearnTrackName(g.submodule.uplearn_url, g.submodule.code)}>
            {uplearnLabel(g.submodule.uplearn_url, g.submodule.code)}
          </ExternalLink>
        )}
      </header>
      <PrerequisiteBox
        submodule={{ ...g.submodule, first_week: null, last_week: null, prerequisites: g.prerequisites }}
        onToggle={onTogglePrerequisite}
        idScope={g.week.key}
      />
      {g.week.tasks.length === 0 ? (
        <p className="muted">No tasks listed for this week.</p>
      ) : (
        <ul className="task-list">
          {g.week.tasks.map((t) => (
            <TaskRow
              key={t.key}
              task={t}
              onToggle={onToggleTask}
              track={g.submodule}
              schedulePost={g.week.schedule_post_url ? { weekNumber: g.week.week_number, url: g.week.schedule_post_url } : null}
            />
          ))}
        </ul>
      )}
      {g.assessment_resources?.map((box) => <ResourceBox key={box.assessment_key} box={box} />)}
      <LiveNote text={`Week ${g.week.week_number} complete.`} show={justCompleted} />
      <CompletionStamp complete={complete} size="lg" slot>
        Week complete
      </CompletionStamp>
    </section>
  )
}
