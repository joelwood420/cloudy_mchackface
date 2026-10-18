import { type QueryClient, useMutation, useQueryClient } from '@tanstack/react-query'
import { type ModuleDetail, type ModuleSummary, setPrerequisiteDone, setTaskDone } from '../api'
import { withPrerequisiteDone, withTaskDone } from '../progress'
import { withModuleCompleted } from '../rewards'

/**
 * Only the last tick in flight refetches, so earlier answers don't overwrite later clicks. Task and prerequisite
 * ticks share one key and either can be last, so both refresh the same things: every cached module (a shared
 * prerequisite can appear in any of them) and the module list that feeds the sidebar and programme progress.
 */
function settleTicks(queryClient: QueryClient, mutationKey: readonly unknown[]) {
  if (queryClient.isMutating({ mutationKey }) !== 1) return
  void queryClient.invalidateQueries({ queryKey: ['module'] })
  void queryClient.invalidateQueries({ queryKey: ['modules'] })
  void queryClient.invalidateQueries({ queryKey: ['this-week'] })
}

/**
 * Move a module's count in the cached module list straight away, so the sidebar and its completion stamps keep up with
 * the tick. Returns the list as it was, for undoing on error.
 */
export async function bumpModuleCount(queryClient: QueryClient, match: (m: ModuleSummary) => boolean, delta: number) {
  await queryClient.cancelQueries({ queryKey: ['modules'] })
  const previous = queryClient.getQueryData<ModuleSummary[]>(['modules'])
  if (previous) queryClient.setQueryData(['modules'], withModuleCompleted(previous, match, delta))
  return previous
}

/** Tick or untick a task: show it straight away, undo on error, then sync with the server once quiet. */
export function useTickTask(moduleKey: string) {
  const queryClient = useQueryClient()
  const moduleQuery = ['module', moduleKey]
  const mutationKey = ['tick', moduleKey]
  return useMutation({
    mutationKey,
    mutationFn: ({ taskKey, done }: { taskKey: string; done: boolean }) => setTaskDone(taskKey, done),
    onMutate: async ({ taskKey, done }) => {
      await queryClient.cancelQueries({ queryKey: moduleQuery })
      const previous = queryClient.getQueryData<ModuleDetail>(moduleQuery)
      if (previous) queryClient.setQueryData(moduleQuery, withTaskDone(previous, taskKey, done))
      const wasDone = previous?.weeks.some((w) => w.tasks.some((t) => t.key === taskKey && t.done))
      const previousModules =
        previous && wasDone !== done ? await bumpModuleCount(queryClient, (m) => m.key === moduleKey, done ? 1 : -1) : undefined
      return { previous, previousModules }
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(moduleQuery, context.previous)
      if (context?.previousModules) queryClient.setQueryData(['modules'], context.previousModules)
    },
    onSettled: () => {
      settleTicks(queryClient, mutationKey)
    },
  })
}

/** Like useTickTask, for prerequisites. Shares the same mutation key so task and prerequisite ticks settle together. */
export function useTickPrerequisite(moduleKey: string) {
  const queryClient = useQueryClient()
  const moduleQuery = ['module', moduleKey]
  const mutationKey = ['tick', moduleKey]
  return useMutation({
    mutationKey,
    mutationFn: ({ prerequisiteKey, completed }: { prerequisiteKey: string; completed: boolean }) =>
      setPrerequisiteDone(prerequisiteKey, completed),
    onMutate: async ({ prerequisiteKey, completed }) => {
      await queryClient.cancelQueries({ queryKey: moduleQuery })
      const previous = queryClient.getQueryData<ModuleDetail>(moduleQuery)
      if (previous) queryClient.setQueryData(moduleQuery, withPrerequisiteDone(previous, prerequisiteKey, completed))
      return { previous }
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(moduleQuery, context.previous)
    },
    onSettled: () => {
      settleTicks(queryClient, mutationKey)
    },
  })
}
