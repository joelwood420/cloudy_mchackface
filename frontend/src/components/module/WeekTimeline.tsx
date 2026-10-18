import { useEffect, useRef, useState } from 'react'
import type { Submodule, Task, TaskType, Week } from '../../api'
import { plural, weekRange } from '../../format'
import { useJustReached } from '../../hooks/useJustReached'
import { useSessionState } from '../../hooks/useSessionState'
import { percent, weekDone } from '../../progress'
import { uplearnLabel, uplearnName, uplearnTrackName } from '../../uplearn'
import { ExternalLink } from '../ExternalLink'
import { ProgressBar } from '../ProgressBar'
import { CompletionStamp, LiveNote, SLAM_MS } from '../Stamp'
import { PrerequisiteBox } from './PrerequisiteBox'

const TYPE_LABELS: Record<TaskType, string> = {
  learning_path: 'Learning path',
  lab: 'Lab',
  assessment_step: 'Assessment',
}

/** The track a task sits in, so its UPLearn link can be dropped when it only repeats the track's own link. */
export interface TrackRef {
  code: string
  uplearn_url: string | null
}

/** A week's schedule post, which is where tutors put lab access details. */
export interface SchedulePostRef {
  weekNumber: number
  url: string
}

export function TaskRow({
  task,
  onToggle,
  track,
  schedulePost,
}: {
  task: Task
  onToggle: (taskKey: string, done: boolean) => void
  track?: TrackRef
  schedulePost?: SchedulePostRef | null
}) {
  const id = `task-${task.key}`
  const uplearn = task.uplearn_url && task.uplearn_url !== track?.uplearn_url ? task.uplearn_url : null
  const uplearnText = uplearn ? uplearnLabel(uplearn, track?.code) : ''
  return (
    <li className={`task-row${task.done ? ' is-done' : ''}`}>
      {/* The box gets a full-size tap target of its own, so tapping the title to read it doesn't tick the task. */}
      <label className="tick">
        <input
          type="checkbox"
          id={id}
          checked={task.done}
          onChange={() => onToggle(task.key, !task.done)}
          aria-labelledby={`${id}-title`}
          aria-describedby={task.note ? `${id}-note` : undefined}
        />
      </label>
      <span className="task-main">
        <span id={`${id}-title`} className="task-title">
          {task.title}
        </span>
        {task.note && (
          <span id={`${id}-note`} className="task-note">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 11v5M12 8h.01" />
            </svg>
            {task.note}
          </span>
        )}
        {task.type === 'lab' && schedulePost && (
          <span className="task-note">
            <span>
              Lab access details are in the{' '}
              <ExternalLink href={schedulePost.url}>{`Week ${schedulePost.weekNumber} schedule post`}</ExternalLink>.
            </span>
          </span>
        )}
      </span>
      <span className="tag">{TYPE_LABELS[task.type]}</span>
      <span className="task-links">
        {task.external_url && <ExternalLink href={task.external_url} label={`Open ${task.title}`}>Open</ExternalLink>}
        {uplearn && (
          <ExternalLink href={uplearn} label={uplearnName(uplearnText, task.title)}>
            {uplearnText}
          </ExternalLink>
        )}
      </span>
    </li>
  )
}

export function WeekCard({
  week,
  open,
  isLast,
  isCurrent,
  onToggle,
  onToggleTask,
  track,
}: {
  week: Week
  open: boolean
  isCurrent: boolean
  isLast: boolean
  onToggle: () => void
  onToggleTask: (taskKey: string, done: boolean) => void
  track?: TrackRef
}) {
  const panelId = `week-panel-${week.key}`
  const post = week.schedule_post_url ? { weekNumber: week.week_number, url: week.schedule_post_url } : null
  const complete = week.tasks.length > 0 && weekDone(week) === week.tasks.length
  const justCompleted = useJustReached(complete, SLAM_MS)
  return (
    <li className="timeline-item" id={`week-${week.key}`}>
      <div className="timeline-rail" aria-hidden="true">
        {!isLast && <span className="timeline-line" />}
        <span className={`timeline-dot${isCurrent ? ' is-current' : ''}`}>{week.week_number}</span>
      </div>
      <div className={`card week-card${open ? ' is-open' : ''}`}>
        <h4 className="week-heading">
          <button type="button" className="week-toggle" aria-expanded={open} aria-controls={panelId} onClick={onToggle}>
            <span className="week-label">
              <span className="mono small muted">Week {week.week_number}</span>
              {isCurrent && <span className="current-badge">Current week</span>}
              <span className="week-title">{week.title}</span>
            </span>
            <span className="week-meta">
              <span className="week-meta-top">
                <span className="small muted">
                  {week.tasks.length === 0 ? 'No tasks' : `${weekDone(week)}/${week.tasks.length} done`}
                </span>
                <CompletionStamp complete={complete} size="sm">
                  Complete
                </CompletionStamp>
              </span>
              <ProgressBar value={percent(weekDone(week), week.tasks.length)} label={`Week ${week.week_number} progress`} size="sm" decorative />
            </span>
            <svg className="chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
        </h4>
        {open && (
          <div id={panelId} className="week-panel">
            {post && (
              <p className="week-post">
                <ExternalLink href={post.url}>{`Week ${post.weekNumber} schedule post`}</ExternalLink>
              </p>
            )}
            {week.tasks.length === 0 ? (
              <p className="muted">No tasks listed for this week.</p>
            ) : (
              <ul className="task-list">
                {week.tasks.map((task) => (
                  <TaskRow key={task.key} task={task} onToggle={onToggleTask} track={track} schedulePost={post} />
                ))}
              </ul>
            )}
            <LiveNote text={`Week ${week.week_number} complete.`} show={justCompleted} />
          </div>
        )}
      </div>
    </li>
  )
}

interface WeekGroup {
  submodule: Submodule | null
  weeks: Week[]
}

/** Weeks grouped by submodule, in submodule order. Weeks with an unknown submodule go in a last, unnamed group. */
function groupWeeks(weeks: Week[], submodules: Submodule[]): WeekGroup[] {
  const known = new Set(submodules.map((s) => s.key))
  const groups: WeekGroup[] = submodules.map((s) => ({ submodule: s, weeks: weeks.filter((w) => w.submodule_key === s.key) }))
  const orphans = weeks.filter((w) => !known.has(w.submodule_key))
  if (orphans.length > 0) groups.push({ submodule: null, weeks: orphans })
  return groups
}

function SubmoduleHead({ submodule }: { submodule: Submodule }) {
  const { first_week: first, last_week: last } = submodule
  return (
    <header className="submodule-head">
      <h3 id={`submodule-${submodule.key}`}>
        <span className="mono">{submodule.code}</span> · {submodule.title}
      </h3>
      {first !== null && last !== null && <span className="small muted">{weekRange(first, last)}</span>}
      {submodule.uplearn_url && (
        <ExternalLink href={submodule.uplearn_url} label={uplearnTrackName(submodule.uplearn_url, submodule.code)}>
          {uplearnLabel(submodule.uplearn_url, submodule.code)}
        </ExternalLink>
      )}
    </header>
  )
}

type WeekChoice = { key: string | null } | null

const isWeekChoice = (v: unknown): v is WeekChoice =>
  v === null || (typeof v === 'object' && (typeof (v as { key?: unknown }).key === 'string' || (v as { key?: unknown }).key === null))

const isStringList = (v: unknown): v is string[] => Array.isArray(v) && v.every((k) => typeof k === 'string')

/** Every week in the track has tasks and all of them are ticked. */
function trackComplete(weeks: Week[]): boolean {
  return weeks.length > 0 && weeks.every((w) => w.tasks.length > 0 && weekDone(w) === w.tasks.length)
}

/** A finished track folded to one line, so the weeks still to do sit near the top. */
function FinishedTrack({ weeks, expanded, controls, onToggle }: { weeks: Week[]; expanded: boolean; controls: string; onToggle: () => void }) {
  const tasks = weeks.reduce((n, w) => n + w.tasks.length, 0)
  return (
    <div className="track-done">
      <span className="small muted">{`${weeks.length === 1 ? `Week ${weeks[0].week_number}` : `All ${plural(weeks.length, 'week')}`} done · ${tasks}/${tasks} tasks`}</span>
      <CompletionStamp complete size="sm">
        Complete
      </CompletionStamp>
      <button type="button" className="link-button" aria-expanded={expanded} aria-controls={controls} onClick={onToggle}>
        {expanded ? 'Hide weeks' : 'Show weeks'}
      </button>
    </div>
  )
}

export function WeekTimeline({
  moduleKey,
  weeks,
  submodules,
  currentWeek,
  jumpRequest = 0,
  onToggleTask,
  onTogglePrerequisite,
}: {
  moduleKey: string
  weeks: Week[]
  submodules: Submodule[]
  currentWeek: number | null
  /** Goes up by one each time "Jump to this week" is pressed. */
  jumpRequest?: number
  onToggleTask: (taskKey: string, done: boolean) => void
  onTogglePrerequisite: (prerequisiteKey: string, completed: boolean) => void
}) {
  // Until the user opens or closes a week, the current week is open. It may only be known after this-week loads.
  // Both choices are kept for the tab, so a reload (e.g. after a lab) opens the module the way you left it.
  const [choice, setChoice] = useSessionState(`open-week:${moduleKey}`, null, isWeekChoice)
  const [expandedTracks, setExpandedTracks] = useSessionState(`open-tracks:${moduleKey}`, [], isStringList)
  // Only tracks already finished when the page opened start folded; one you finish now stays open so you see it land.
  const [foldable] = useState(() => new Set(groupWeeks(weeks, submodules).filter((g) => trackComplete(g.weeks)).map((g) => g.submodule?.key ?? 'other')))
  const currentKey = weeks.find((w) => w.week_number === currentWeek)?.key ?? null
  const openKey = choice ? choice.key : currentKey
  const toggle = (key: string) => setChoice({ key: openKey === key ? null : key })

  // A press made on another module's page (before this one mounted) isn't a jump here.
  const handledJump = useRef(jumpRequest)
  useEffect(() => {
    if (jumpRequest === handledJump.current || currentKey === null) return
    handledJump.current = jumpRequest
    setChoice({ key: currentKey })
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    requestAnimationFrame(() => {
      const item = document.getElementById(`week-${currentKey}`)
      item?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
      item?.querySelector<HTMLButtonElement>('.week-toggle')?.focus({ preventScroll: true })
    })
  }, [jumpRequest, currentKey, setChoice])

  return (
    <section className="timeline" aria-labelledby="timeline-heading">
      <div className="section-head">
        <h2 id="timeline-heading">Weekly timeline</h2>
        <span className="small muted">Select a week to see its tasks</span>
      </div>
      {weeks.length === 0 && submodules.length === 0 ? (
        <p className="muted">No weeks listed yet.</p>
      ) : (
        groupWeeks(weeks, submodules).map((group) => {
          const groupKey = group.submodule?.key ?? 'other'
          const listId = `track-weeks-${groupKey}`
          const finished = foldable.has(groupKey) && trackComplete(group.weeks) && !group.weeks.some((w) => w.key === currentKey)
          const expanded = expandedTracks.includes(groupKey)
          const showWeeks = group.weeks.length > 0 && (!finished || expanded)
          return (
            <section
              key={groupKey}
              className={`submodule${finished ? ' is-finished' : ''}`}
              aria-labelledby={group.submodule ? `submodule-${group.submodule.key}` : undefined}
            >
              {group.submodule && <SubmoduleHead submodule={group.submodule} />}
              {group.submodule && <PrerequisiteBox submodule={group.submodule} onToggle={onTogglePrerequisite} />}
              {finished && (
                <FinishedTrack
                  weeks={group.weeks}
                  expanded={expanded}
                  controls={listId}
                  onToggle={() => setExpandedTracks(expanded ? expandedTracks.filter((k) => k !== groupKey) : [...expandedTracks, groupKey])}
                />
              )}
              {showWeeks && (
                <ol className="timeline-list" id={listId}>
                  {group.weeks.map((week, i) => (
                    <WeekCard
                      key={week.key}
                      week={week}
                      open={openKey === week.key}
                      isLast={i === group.weeks.length - 1}
                      isCurrent={week.week_number === currentWeek}
                      onToggle={() => toggle(week.key)}
                      onToggleTask={onToggleTask}
                      track={group.submodule ?? undefined}
                    />
                  ))}
                </ol>
              )}
            </section>
          )
        })
      )}
    </section>
  )
}
