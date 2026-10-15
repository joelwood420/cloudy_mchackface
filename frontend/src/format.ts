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

export function weekSummary(weekNumbers: number[], taskCount: number): string {
  if (weekNumbers.length === 0) return 'No weeks yet'
  const first = Math.min(...weekNumbers)
  const last = Math.max(...weekNumbers)
  const range = first === last ? `Week ${first}` : `Weeks ${first}–${last}`
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
