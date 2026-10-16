import { describe, expect, it } from 'vitest'
import type { ThisWeek } from './api'
import { countdownLabel, countdownTone, dateSpan, dayDate, daysUntil, formatDueDate, plural, shortDate, weekFooter, weekRange, weekSummary } from './format'
import { THIS_WEEK } from './test/utils'

describe('format', () => {
  it('formats due dates without shifting the day', () => {
    expect(formatDueDate('2026-10-25')).toMatch(/25 Oct 2026/)
    expect(formatDueDate('2026-01-01')).toMatch(/1 Jan 2026/)
  })

  it('pluralises', () => {
    expect(plural(1, 'week')).toBe('1 week')
    expect(plural(0, 'task')).toBe('0 tasks')
    expect(plural(8, 'week')).toBe('8 weeks')
  })

  it("summarises a module's weeks", () => {
    expect(weekSummary([9, 10, 11, 12, 13, 14, 15, 16], 40)).toBe('Weeks 9–16 · 8 weeks · 40 tasks')
    expect(weekSummary([3], 1)).toBe('Week 3 · 1 week · 1 task')
    expect(weekSummary([], 0)).toBe('No weeks yet')
  })

  it('counts calendar days until a due date', () => {
    const lateEvening = new Date(2026, 9, 15, 23, 30)
    expect(daysUntil('2026-10-25', lateEvening)).toBe(10)
    expect(daysUntil('2026-10-15', lateEvening)).toBe(0)
    expect(daysUntil('2026-10-16', lateEvening)).toBe(1)
    expect(daysUntil('2026-10-12', lateEvening)).toBe(-3)
  })

  it('words the countdown', () => {
    expect(countdownLabel(10)).toBe('10 days')
    expect(countdownLabel(1)).toBe('1 day')
    expect(countdownLabel(0)).toBe('Due today')
    expect(countdownLabel(-1)).toBe('1 day overdue')
    expect(countdownLabel(-3)).toBe('3 days overdue')
  })

  it('picks a tone for the countdown', () => {
    expect(countdownTone(8)).toBe('')
    expect(countdownTone(7)).toBe('is-soon')
    expect(countdownTone(0)).toBe('is-soon')
    expect(countdownTone(-1)).toBe('is-overdue')
  })
})

describe('weekRange', () => {
  it('names one week or a range', () => {
    expect(weekRange(9, 9)).toBe('Week 9')
    expect(weekRange(10, 12)).toBe('Weeks 10–12')
  })
})

describe('dates', () => {
  it('formats short and day dates without shifting the day', () => {
    expect(shortDate('2026-10-12')).toBe('12 Oct')
    expect(dayDate('2026-10-12')).toBe('Mon 12 Oct')
  })
  it('spans a week inside one month or across two', () => {
    expect(dateSpan('2026-10-12', '2026-10-18')).toBe('12–18 Oct')
    expect(dateSpan('2026-09-28', '2026-10-04')).toBe('28 Sep – 4 Oct')
  })
})

describe('weekFooter', () => {
  const tw = (over: Partial<ThisWeek>): ThisWeek => ({ ...THIS_WEEK, ...over })
  it('names the week and its dates while teaching', () => {
    expect(weekFooter(THIS_WEEK)).toBe('Week 11 · 12–18 Oct')
  })
  it('says when a break ends', () => {
    expect(weekFooter(tw({ status: 'break', week: null, current_break: { starts_on: '2026-09-14', ends_on: '2026-09-27', week_of_break: 1, length_weeks: 2 } }))).toBe('On break until 27 Sep')
  })
  it('says when the programme starts, or that it has finished', () => {
    expect(weekFooter(tw({ status: 'before_start', week: null, next_week: { week_number: 1, starts_on: '2026-07-20' } }))).toBe('Starts Mon 20 Jul')
    expect(weekFooter(tw({ status: 'finished', week: null }))).toBe('Programme finished')
  })
})
