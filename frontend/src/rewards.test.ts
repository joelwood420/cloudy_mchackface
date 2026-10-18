import { describe, expect, it } from 'vitest'
import type { ModuleSummary, ThisWeek } from './api'
import { crossedMilestone, findThisWeekTask, milestoneMessage, weekClearedLine, withModuleCompleted } from './rewards'
import { THIS_WEEK } from './test/utils'

describe('crossedMilestone', () => {
  it('fires when one tick crosses a milestone', () => {
    expect(crossedMilestone(1, 2, 8)).toBe(25)
    expect(crossedMilestone(3, 4, 8)).toBe(50)
    expect(crossedMilestone(5, 6, 8)).toBe(75)
    expect(crossedMilestone(7, 8, 8)).toBe(100)
  })
  it('stays quiet between milestones', () => {
    expect(crossedMilestone(2, 3, 8)).toBeNull()
    expect(crossedMilestone(0, 1, 8)).toBeNull()
  })
  it('only counts a single step up, so unticks, loads and syncs never fire', () => {
    expect(crossedMilestone(4, 3, 8)).toBeNull()
    expect(crossedMilestone(0, 8, 8)).toBeNull()
    expect(crossedMilestone(4, 4, 8)).toBeNull()
  })
  it('gives the highest milestone when one tick crosses two', () => {
    expect(crossedMilestone(0, 1, 2)).toBe(50)
    expect(crossedMilestone(0, 1, 1)).toBe(100)
  })
  it('ignores an empty module', () => expect(crossedMilestone(0, 1, 0)).toBeNull())
})

describe('messages', () => {
  it('escalates privileges by milestone', () => {
    expect(milestoneMessage('CCC601', 25)).toBe('CCC601 · access granted: user')
    expect(milestoneMessage('CCC601', 50)).toBe('CCC601 · privilege escalated: admin')
    expect(milestoneMessage('CCC601', 75)).toBe('CCC601 · privilege escalated: root')
    expect(milestoneMessage('CCC601', 100)).toBe('CCC601 · system owned. 100% complete.')
  })
  it('patches the week', () => expect(weekClearedLine(11)).toBe('> week_11 :: all tasks patched'))
})

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
