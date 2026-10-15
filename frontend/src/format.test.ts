import { describe, expect, it } from 'vitest'
import { countdownLabel, countdownTone, daysUntil, formatDueDate, plural, weekSummary } from './format'

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
