import { useId, useState } from 'react'
import type { ThisWeek } from '../../api'
import { useJustReached } from '../../hooks/useJustReached'
import { WeekGroups } from './WeekGroups'

/** How long the prompt's arrival animation runs when it turns up while you're on the page. */
const ARRIVE_MS = 600

/**
 * Once this week is done, offer next week instead of dumping it on the page. The prompt arrives after the server
 * confirms the week, so it eases in rather than popping.
 */
export function AheadPrompt({
  weekNumber,
  ahead,
  onToggleTask,
  onTogglePrerequisite,
}: {
  weekNumber: number | null
  ahead: ThisWeek['ahead']
  onToggleTask: (taskKey: string, done: boolean) => void
  onTogglePrerequisite: (prerequisiteKey: string, completed: boolean) => void
}) {
  const [open, setOpen] = useState(false)
  const panelId = useId()
  const arriving = useJustReached(ahead !== null, ARRIVE_MS)
  if (!ahead) return null
  const next = ahead.week_number
  return (
    <section className={`ahead${arriving ? ' is-arriving' : ''}`} aria-label={`Week ${next}`}>
      <div className="card ahead-prompt">
        <p className="ahead-text">
          {weekNumber !== null ? `Week ${weekNumber} done. You're ahead of schedule.` : "You're ahead of schedule."}
        </p>
        <button type="button" className="button-secondary" aria-expanded={open} aria-controls={open ? panelId : undefined} onClick={() => setOpen(!open)}>
          {open ? `Hide Week ${next}` : `Get a head start on Week ${next}`}
        </button>
      </div>
      {open && (
        <div id={panelId} className="ahead-panel">
          {ahead.groups.length === 0 ? (
            <p className="muted">Week {next} isn't in the app yet.</p>
          ) : (
            <WeekGroups groups={ahead.groups} onToggleTask={onToggleTask} onTogglePrerequisite={onTogglePrerequisite} />
          )}
        </div>
      )}
    </section>
  )
}
