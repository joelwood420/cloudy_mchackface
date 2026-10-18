import type { ModuleSummary, ThisWeek } from './api'
import { percent } from './progress'

export const MILESTONES = [25, 50, 75, 100] as const
export type Milestone = (typeof MILESTONES)[number]

/**
 * The highest milestone that one tick crossed, or null. Only a single step up counts, so page loads, syncs with the
 * server and unticks never fire a reward.
 */
export function crossedMilestone(before: number, after: number, total: number): Milestone | null {
  if (total === 0 || after !== before + 1) return null
  const from = percent(before, total)
  const to = percent(after, total)
  return [...MILESTONES].reverse().find((m) => from < m && to >= m) ?? null
}

const RANKS: Record<Milestone, string> = {
  25: 'access granted: user',
  50: 'privilege escalated: admin',
  75: 'privilege escalated: root',
  100: 'system owned. 100% complete.',
}

export const milestoneMessage = (moduleCode: string, milestone: Milestone) => `${moduleCode} · ${RANKS[milestone]}`

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
