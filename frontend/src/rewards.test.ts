import { describe, expect, it } from 'vitest'
import type { ModuleSummary, ThisWeek } from './api'
import { findThisWeekTask, withModuleCompleted } from './rewards'
import { THIS_WEEK } from './test/utils'

const summary = (key: string, code: string, done: number): ModuleSummary => ({
  key, code, title: code, submodule_count: 1, week_count: 1, task_count: 8, completed_count: done, week_numbers: [1], uplearn_url: null,
})

describe('withModuleCompleted', () => {
  it('moves one module’s count and leaves the rest alone', () => {
    const list = [summary('a', 'A', 1), summary('b', 'B', 2)]
    const [a, b] = withModuleCompleted(list, (m) => m.code === 'B', 1)
    expect(a).toBe(list[0])
    expect(b.completed_count).toBe(3)
  })
  it('never goes below zero or past the total', () => {
    expect(withModuleCompleted([summary('a', 'A', 0)], () => true, -1)[0].completed_count).toBe(0)
    expect(withModuleCompleted([summary('a', 'A', 8)], () => true, 1)[0].completed_count).toBe(8)
  })
})

describe('findThisWeekTask', () => {
  const t = (key: string, done: boolean) => ({ key, title: key, type: 'lab' as const, external_url: null, uplearn_url: null, note: null, done })
  const group = (key: string, done: boolean) => ({
    module_key: 'ccc602', module_code: 'CCC602', module_title: 'M', module_uplearn_url: null,
    submodule: { key: 's', code: 'S', title: 'S', uplearn_url: null },
    week: { key: 'w', submodule_key: 's', week_number: 11, title: 'W', tasks: [t(key, done)], schedule_post_url: null },
    prerequisites: [],
  })
  const tw: ThisWeek = {
    ...THIS_WEEK,
    groups: [group('now', false)],
    ahead: { week_number: 12, groups: [group('next', true)] },
    lurking: [{ week_number: 9, tasks: [{ ...t('old', false), module_code: 'CCC601', submodule_code: 'S', submodule_uplearn_url: null, schedule_post_url: null }] }],
  }
  it('finds a task in this week, next week or the backlog', () => {
    expect(findThisWeekTask(tw, 'now')).toEqual({ done: false, moduleCode: 'CCC602' })
    expect(findThisWeekTask(tw, 'next')).toEqual({ done: true, moduleCode: 'CCC602' })
    expect(findThisWeekTask(tw, 'old')).toEqual({ done: false, moduleCode: 'CCC601' })
    expect(findThisWeekTask(tw, 'nope')).toBeNull()
  })
})
