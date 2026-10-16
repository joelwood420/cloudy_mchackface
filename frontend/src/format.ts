import type { Assessment, ThisWeek } from './api'

/** Format a YYYY-MM-DD date in local time so it never shifts a day. */
export function formatDueDate(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('en-NZ', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function plural(n: number, word: string): string {
  return `${n} ${n === 1 ? word : `${word}s`}`
}

export function weekRange(first: number, last: number): string {
  return first === last ? `Week ${first}` : `Weeks ${first}–${last}`
}

export function weekSummary(weekNumbers: number[], taskCount: number): string {
  if (weekNumbers.length === 0) return 'No weeks yet'
  const range = weekRange(Math.min(...weekNumbers), Math.max(...weekNumbers))
  return `${range} · ${plural(weekNumbers.length, 'week')} · ${plural(taskCount, 'task')}`
}

export function statusChip(a: Assessment): { label: string; tone: 'is-done' | 'is-soon' | 'is-overdue' | '' } | null {
  const days = a.days_until ?? 0
  switch (a.status) {
    case 'submitted':
      return { label: 'Submitted', tone: 'is-done' }
    case 'due_today':
      return { label: 'Due today', tone: 'is-soon' }
    case 'upcoming':
      return { label: `Due in ${plural(days, 'day')}`, tone: days <= 7 ? 'is-soon' : '' }
    case 'overdue':
      return { label: `${plural(-days, 'day')} overdue`, tone: 'is-overdue' }
    default:
      return null
  }
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function localDate(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function shortDate(iso: string): string {
  const d = localDate(iso)
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`
}

export function dayDate(iso: string): string {
  return `${DAYS[localDate(iso).getDay()]} ${shortDate(iso)}`
}

export function dateSpan(start: string, end: string): string {
  const a = localDate(start)
  const b = localDate(end)
  return a.getMonth() === b.getMonth() ? `${a.getDate()}–${shortDate(end)}` : `${shortDate(start)} – ${shortDate(end)}`
}

export function weekFooter(tw: ThisWeek): string {
  if (tw.status === 'teaching' && tw.week) return `Week ${tw.week.week_number} · ${dateSpan(tw.week.starts_on, tw.week.ends_on)}`
  if (tw.status === 'break' && tw.current_break) return `On break until ${shortDate(tw.current_break.ends_on)}`
  if (tw.status === 'before_start') return tw.next_week ? `Starts ${dayDate(tw.next_week.starts_on)}` : 'No schedule yet'
  return 'Programme finished'
}
