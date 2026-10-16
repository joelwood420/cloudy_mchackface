import type { ThisWeek } from './api'

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

/** Whole calendar days from `today` to a YYYY-MM-DD date (negative when past). */
export function daysUntil(iso: string, today: Date): number {
  const [year, month, day] = iso.split('-').map(Number)
  const due = Date.UTC(year, month - 1, day)
  const now = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
  return Math.round((due - now) / 86_400_000)
}

export function countdownLabel(days: number): string {
  if (days < 0) return `${plural(-days, 'day')} overdue`
  if (days === 0) return 'Due today'
  return plural(days, 'day')
}

export function countdownTone(days: number): '' | 'is-soon' | 'is-overdue' {
  if (days < 0) return 'is-overdue'
  if (days <= 7) return 'is-soon'
  return ''
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
