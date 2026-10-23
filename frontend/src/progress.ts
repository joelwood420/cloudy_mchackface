import type { Assessment, AssessmentStatus, ModuleDetail, ModuleSummary, ThisWeek, ThisWeekGroup, Week } from './api'

/** Whole percent, rounded down so 100 only shows when everything is done. 0 when there is nothing to do. */
export function percent(done: number, total: number): number {
  return total === 0 ? 0 : Math.floor((done * 100) / total)
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

/** Every module is an equal share, so one whose content isn't loaded yet (no tasks) counts as 0%, not as nothing. */
export function programmeProgress(modules: ModuleSummary[]) {
  const share = modules.reduce((sum, m) => sum + (m.task_count === 0 ? 0 : m.completed_count / m.task_count), 0)
  const modulesDone = modules.filter((m) => m.task_count > 0 && m.completed_count === m.task_count).length
  const pct = modules.length === 0 ? 0 : Math.floor((share * 100) / modules.length)
  return { modulesDone, modules: modules.length, pct }
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

export function assessmentStatus(daysUntil: number | null, submitted: boolean): AssessmentStatus {
  if (submitted) return 'submitted'
  if (daysUntil === null) return 'no_date'
  if (daysUntil < 0) return 'overdue'
  return daysUntil === 0 ? 'due_today' : 'upcoming'
}

export function withAssessmentSubmitted<T extends Assessment>(list: T[], key: string, submitted: boolean): T[] {
  return list.map((a) => (a.key === key ? { ...a, submitted, status: assessmentStatus(a.days_until, submitted) } : a))
}

/** Copy of `mod` with one prerequisite ticked or unticked in every submodule that lists it. */
export function withPrerequisiteDone(mod: ModuleDetail, prerequisiteKey: string, completed: boolean): ModuleDetail {
  return {
    ...mod,
    submodules: mod.submodules.map((sub) =>
      sub.prerequisites.some((p) => p.key === prerequisiteKey)
        ? { ...sub, prerequisites: sub.prerequisites.map((p) => (p.key === prerequisiteKey ? { ...p, completed } : p)) }
        : sub,
    ),
  }
}

function tickGroups(groups: ThisWeekGroup[], taskKey: string, done: boolean): ThisWeekGroup[] {
  return groups.map((g) =>
    g.week.tasks.some((t) => t.key === taskKey)
      ? { ...g, week: { ...g.week, tasks: g.week.tasks.map((t) => (t.key === taskKey ? { ...t, done } : t)) } }
      : g,
  )
}

export function withThisWeekTaskDone(tw: ThisWeek, taskKey: string, done: boolean): ThisWeek {
  const groups = tickGroups(tw.groups, taskKey, done)
  return {
    ...tw,
    groups,
    ahead: tw.ahead && { ...tw.ahead, groups: tickGroups(tw.ahead.groups, taskKey, done) },
    lurking: tw.lurking.map((w) => ({ ...w, tasks: w.tasks.map((t) => (t.key === taskKey ? { ...t, done } : t)) })),
    stats: { ...tw.stats, done: groups.reduce((n, g) => n + weekDone(g.week), 0) },
  }
}

export function withThisWeekPrerequisiteDone(tw: ThisWeek, key: string, completed: boolean): ThisWeek {
  const tick = (groups: ThisWeekGroup[]) =>
    groups.map((g) => ({ ...g, prerequisites: g.prerequisites.map((p) => (p.key === key ? { ...p, completed } : p)) }))
  return { ...tw, groups: tick(tw.groups), ahead: tw.ahead && { ...tw.ahead, groups: tick(tw.ahead.groups) } }
}
