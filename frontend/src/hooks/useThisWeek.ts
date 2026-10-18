import { type QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { type ThisWeek, fetchThisWeek, setPrerequisiteDone, setTaskDone } from '../api'
import { withThisWeekPrerequisiteDone, withThisWeekTaskDone } from '../progress'
import { findThisWeekTask } from '../rewards'
import { bumpModuleCount } from './useTickTask'

export function useThisWeek() {
  return useQuery({ queryKey: ['this-week'], queryFn: fetchThisWeek })
}

const thisWeekKey = ['this-week']
const mutationKey = ['tick', 'this-week']

function settle(queryClient: QueryClient) {
  if (queryClient.isMutating({ mutationKey }) !== 1) return
  void queryClient.invalidateQueries({ queryKey: thisWeekKey })
  void queryClient.invalidateQueries({ queryKey: ['module'] })
  void queryClient.invalidateQueries({ queryKey: ['modules'] })
}

/** How a change moves a module's completed count: which module (by code) and by how much. */
type ModuleBump = { moduleCode: string; delta: number } | null

function useOptimisticThisWeek<V>(
  mutationFn: (v: V) => Promise<void>,
  apply: (tw: ThisWeek, v: V) => ThisWeek,
  bump: (tw: ThisWeek, v: V) => ModuleBump = () => null,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey,
    mutationFn,
    onMutate: async (vars: V) => {
      await queryClient.cancelQueries({ queryKey: thisWeekKey })
      const previous = queryClient.getQueryData<ThisWeek>(thisWeekKey)
      if (previous) queryClient.setQueryData(thisWeekKey, apply(previous, vars))
      const change = previous ? bump(previous, vars) : null
      const previousModules = change
        ? await bumpModuleCount(queryClient, (m) => m.code === change.moduleCode, change.delta)
        : undefined
      return { previous, previousModules }
    },
    onError: (_e, _v, context) => {
      if (context?.previous) queryClient.setQueryData(thisWeekKey, context.previous)
      if (context?.previousModules) queryClient.setQueryData(['modules'], context.previousModules)
    },
    onSettled: () => settle(queryClient),
  })
}

export const useTickThisWeekTask = () =>
  useOptimisticThisWeek(
    ({ taskKey, done }: { taskKey: string; done: boolean }) => setTaskDone(taskKey, done),
    (tw, { taskKey, done }) => withThisWeekTaskDone(tw, taskKey, done),
    (tw, { taskKey, done }) => {
      const found = findThisWeekTask(tw, taskKey)
      return found && found.done !== done ? { moduleCode: found.moduleCode, delta: done ? 1 : -1 } : null
    },
  )

export const useTickThisWeekPrerequisite = () =>
  useOptimisticThisWeek(
    ({ prerequisiteKey, completed }: { prerequisiteKey: string; completed: boolean }) => setPrerequisiteDone(prerequisiteKey, completed),
    (tw, { prerequisiteKey, completed }) => withThisWeekPrerequisiteDone(tw, prerequisiteKey, completed),
  )
