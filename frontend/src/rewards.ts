import type { ModuleSummary, ThisWeek } from './api'

/** Copy of the module list with one module's completed count moved by `delta`, kept within 0 and its task count. */
export function withModuleCompleted(list: ModuleSummary[], match: (m: ModuleSummary) => boolean, delta: number): ModuleSummary[] {
  return list.map((m) =>
    match(m) ? { ...m, completed_count: Math.max(0, Math.min(m.task_count, m.completed_count + delta)) } : m,
  )
}

/** A task anywhere on This week (this week, next week or the backlog), with the code of the module it belongs to. */
export function findThisWeekTask(tw: ThisWeek, taskKey: string): { done: boolean; moduleCode: string } | null {
  for (const g of [...tw.groups, ...(tw.ahead?.groups ?? [])]) {
    const t = g.week.tasks.find((x) => x.key === taskKey)
    if (t) return { done: t.done, moduleCode: g.module_code }
  }
  for (const w of tw.lurking) {
    const t = w.tasks.find((x) => x.key === taskKey)
    if (t) return { done: t.done, moduleCode: t.module_code }
  }
  return null
}
