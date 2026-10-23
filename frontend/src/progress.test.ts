import { describe, expect, it } from 'vitest'
import type { ModuleDetail, ModuleSummary, Submodule } from './api'
import { assessmentStatus, moduleProgress, percent, programmeProgress, withAssessmentSubmitted, withPrerequisiteDone, withTaskDone, withThisWeekPrerequisiteDone, withThisWeekTaskDone } from './progress'
import { THIS_WEEK } from './test/utils'

describe('assessments', () => {
  const a3 = { key: 'a3', title: 'A3', due_date: '2026-10-25', uplearn_url: null, submitted: false, status: 'upcoming' as const, days_until: 8 }
  const a1 = { key: 'a1', title: 'A1', due_date: '2026-08-16', uplearn_url: null, submitted: false, status: 'overdue' as const, days_until: -62 }
  it('works out status from days and the tick', () => {
    expect(assessmentStatus(8, false)).toBe('upcoming')
    expect(assessmentStatus(0, false)).toBe('due_today')
    expect(assessmentStatus(-1, false)).toBe('overdue')
    expect(assessmentStatus(-1, true)).toBe('submitted')
    expect(assessmentStatus(null, false)).toBe('no_date')
  })
  it('ticks one assessment and recomputes its status', () => {
    const [x, y] = withAssessmentSubmitted([a3, a1], 'a1', true)
    expect(x).toBe(a3)
    expect(y).toEqual({ ...a1, submitted: true, status: 'submitted' })
    expect(withAssessmentSubmitted([y], 'a1', false)[0].status).toBe('overdue')
  })
})

const task = (key: string, done: boolean) => ({ key, title: key, type: 'lab' as const, external_url: null, uplearn_url: 'https://up.test', note: null, done })

const mod: ModuleDetail = {
  key: 'm', code: 'M', title: 'M', uplearn_url: null, assessments: [], submodules: [],
  weeks: [
    { key: 'w1', submodule_key: 's', week_number: 1, title: 'W1', tasks: [task('a', true), task('b', true)], schedule_post_url: null },
    { key: 'w2', submodule_key: 's', week_number: 2, title: 'W2', tasks: [task('c', true), task('d', false)], schedule_post_url: null },
    { key: 'w3', submodule_key: 's', week_number: 3, title: 'W3', tasks: [], schedule_post_url: null },
  ],
}

describe('percent', () => {
  it('is 0 for an empty total', () => expect(percent(0, 0)).toBe(0))
  it('rounds down so 100 means everything is done', () => {
    expect(percent(199, 200)).toBe(99)
    expect(percent(1, 3)).toBe(33)
    expect(percent(3, 3)).toBe(100)
  })
  it('is exact where floating point would round down too far', () => {
    expect(percent(29, 100)).toBe(29)
    expect(percent(57, 100)).toBe(57)
  })
})

describe('moduleProgress', () => {
  it('counts tasks and fully done weeks, ignoring empty weeks', () => {
    expect(moduleProgress(mod)).toEqual({ done: 3, total: 4, pct: 75, weeksComplete: 1, weeksWithTasks: 2 })
  })
})

describe('programmeProgress', () => {
  it('weights every module equally, so a module with no tasks yet counts as 0%', () => {
    const summaries = [
      { task_count: 10, completed_count: 10 },
      { task_count: 40, completed_count: 20 },
      { task_count: 4, completed_count: 4 },
      { task_count: 0, completed_count: 0 },
    ] as ModuleSummary[]
    expect(programmeProgress(summaries)).toEqual({ modulesDone: 2, modules: 4, pct: 62 })
  })

  it('only reaches 100% when every module is done', () => {
    const summaries = [
      { task_count: 3, completed_count: 3 },
      { task_count: 0, completed_count: 0 },
    ] as ModuleSummary[]
    expect(programmeProgress(summaries)).toEqual({ modulesDone: 1, modules: 2, pct: 50 })
  })

  it('is 0% with no modules', () => {
    expect(programmeProgress([])).toEqual({ modulesDone: 0, modules: 0, pct: 0 })
  })
})

describe('withTaskDone', () => {
  it('returns a copy with one task changed', () => {
    const next = withTaskDone(mod, 'd', true)
    expect(next.weeks[1].tasks[1].done).toBe(true)
    expect(mod.weeks[1].tasks[1].done).toBe(false)
    expect(next.weeks[0]).toBe(mod.weeks[0])
  })
})

describe('withPrerequisiteDone', () => {
  const prereq = (key: string) => ({ key, title: key, note: null, external_url: 'https://x.test', uplearn_url: null, completed: false })
  const sub = (key: string, keys: string[]): Submodule => ({
    key, code: key, title: key, uplearn_url: null, first_week: 1, last_week: 1, prerequisites: keys.map(prereq),
  })
  const withSubs: ModuleDetail = { ...mod, submodules: [sub('a', ['azure', 'skillable']), sub('b', ['azure']), sub('c', ['aws'])] }

  it('ticks a shared prerequisite in every submodule and leaves others alone', () => {
    const next = withPrerequisiteDone(withSubs, 'azure', true)
    expect(next.submodules[0].prerequisites.map((p) => p.completed)).toEqual([true, false])
    expect(next.submodules[1].prerequisites[0].completed).toBe(true)
    expect(next.submodules[2]).toBe(withSubs.submodules[2])
    expect(withSubs.submodules[0].prerequisites[0].completed).toBe(false)
  })
})

describe('this week ticks', () => {
  const task = (key: string, done = false) => ({ key, title: key, type: 'lab' as const, external_url: 'https://x.test', uplearn_url: null, note: null, done })
  const group = (key: string, tasks: ReturnType<typeof task>[]) => ({
    module_key: 'ccc602', module_code: 'CCC602', module_title: 'DE', module_uplearn_url: null,
    submodule: { key: 'dp900', code: 'DP-900', title: 'DP', uplearn_url: null },
    week: { key, submodule_key: 'dp900', week_number: 11, title: key, tasks, schedule_post_url: null },
    prerequisites: [{ key: 'azure', title: 'Azure', note: null, external_url: 'https://a.test', uplearn_url: null, completed: false }],
  })
  const tw = { ...THIS_WEEK, groups: [group('w11', [task('t1'), task('t2')])], lurking: [{ week_number: 10, tasks: [{ ...task('t0'), module_code: 'CCC602', submodule_code: 'DP-900', submodule_uplearn_url: null, schedule_post_url: null }] }], stats: { done: 0, total: 2, next_deadline_days: null } }

  it('ticks a task in this week and recounts', () => {
    const next = withThisWeekTaskDone(tw, 't1', true)
    expect(next.groups[0].week.tasks[0].done).toBe(true)
    expect(next.stats.done).toBe(1)
  })
  it('ticks a lurking task', () => {
    expect(withThisWeekTaskDone(tw, 't0', true).lurking[0].tasks[0].done).toBe(true)
  })
  it('ticks a prerequisite in every group', () => {
    expect(withThisWeekPrerequisiteDone(tw, 'azure', true).groups[0].prerequisites[0].completed).toBe(true)
  })
})
