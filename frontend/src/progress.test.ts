import { describe, expect, it } from 'vitest'
import type { ModuleDetail, ModuleSummary } from './api'
import { moduleProgress, percent, programmeProgress, withTaskDone } from './progress'

const task = (key: string, done: boolean) => ({ key, title: key, type: 'lab' as const, external_url: null, uplearn_url: 'https://up.test', note: null, done })

const mod: ModuleDetail = {
  key: 'm', code: 'M', title: 'M', uplearn_url: null, assessments: [], submodules: [],
  weeks: [
    { key: 'w1', submodule_key: 's', week_number: 1, title: 'W1', tasks: [task('a', true), task('b', true)] },
    { key: 'w2', submodule_key: 's', week_number: 2, title: 'W2', tasks: [task('c', true), task('d', false)] },
    { key: 'w3', submodule_key: 's', week_number: 3, title: 'W3', tasks: [] },
  ],
}

describe('percent', () => {
  it('is 0 for an empty total', () => expect(percent(0, 0)).toBe(0))
  it('rounds down so 100 means everything is done', () => {
    expect(percent(199, 200)).toBe(99)
    expect(percent(1, 3)).toBe(33)
    expect(percent(3, 3)).toBe(100)
  })
})

describe('moduleProgress', () => {
  it('counts tasks and fully done weeks, ignoring empty weeks', () => {
    expect(moduleProgress(mod)).toEqual({ done: 3, total: 4, pct: 75, weeksComplete: 1, weeksWithTasks: 2 })
  })
})

describe('programmeProgress', () => {
  it('sums every module', () => {
    const summaries = [
      { task_count: 10, completed_count: 5 },
      { task_count: 0, completed_count: 0 },
      { task_count: 10, completed_count: 0 },
    ] as ModuleSummary[]
    expect(programmeProgress(summaries)).toEqual({ done: 5, total: 20, pct: 25 })
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
