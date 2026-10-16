import type { ThisWeek } from '../../api'
import { dayDate, plural } from '../../format'

export function UpcomingBreakBanner({ upcoming }: { upcoming: NonNullable<ThisWeek['upcoming_break']> }) {
  return (
    <p className="notice">
      {`Break coming up: ${plural(upcoming.length_weeks, 'week')}, ${dayDate(upcoming.starts_on)} – ${dayDate(upcoming.ends_on)}. Week ${upcoming.resumes_week} starts ${dayDate(upcoming.resumes_on)}.`}
    </p>
  )
}

export function HolidayNotes({ holidays }: { holidays: ThisWeek['holidays'] }) {
  return (
    <>
      {holidays.map((h) => (
        <p key={h.day} className="notice">
          {`${h.name}, ${dayDate(h.day)}: campus closed.`}
        </p>
      ))}
    </>
  )
}

export function CatchUpNote({ throughWeek, onDismiss }: { throughWeek: number; onDismiss: () => void }) {
  const weeks = throughWeek === 1 ? 'week 1' : `weeks 1–${throughWeek}`
  return (
    <div className="notice notice-row">
      <p>{`We've marked ${weeks} as done. Untick anything you haven't finished.`}</p>
      <button type="button" className="link-button" onClick={onDismiss}>Dismiss</button>
    </div>
  )
}
