import type { ModuleDetail, ModuleSummary, Week } from './api'

/** Whole percent, rounded down so 100 only shows when everything is done. 0 when there is nothing to do. */
export function percent(done: number, total: number): number {
  return total === 0 ? 0 : Math.floor((done / total) * 100)
}

export function weekDone(week: Week): number {
  return week.tasks.filter((t) => t.done).length
}

export function moduleProgress(mod: ModuleDetail) {
  let done = 0
  let total = 0
  let weeksComplete = 0
  let weeksWithTasks = 0
  for (const week of mod.weeks) {
    const d = weekDone(week)
    done += d
    total += week.tasks.length
    if (week.tasks.length > 0) {
      weeksWithTasks += 1
      if (d === week.tasks.length) weeksComplete += 1
    }
  }
  return { done, total, pct: percent(done, total), weeksComplete, weeksWithTasks }
}

export function programmeProgress(modules: ModuleSummary[]) {
  const done = modules.reduce((sum, m) => sum + m.completed_count, 0)
  const total = modules.reduce((sum, m) => sum + m.task_count, 0)
  return { done, total, pct: percent(done, total) }
}

export function withTaskDone(mod: ModuleDetail, taskKey: string, done: boolean): ModuleDetail {
  return {
    ...mod,
    weeks: mod.weeks.map((week) =>
      week.tasks.some((t) => t.key === taskKey)
        ? { ...week, tasks: week.tasks.map((t) => (t.key === taskKey ? { ...t, done } : t)) }
        : week,
    ),
  }
}
