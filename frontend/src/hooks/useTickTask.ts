import { useMutation, useQueryClient } from '@tanstack/react-query'
import { type ModuleDetail, setTaskDone } from '../api'
import { withTaskDone } from '../progress'

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
      return { previous }
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(moduleQuery, context.previous)
    },
    onSettled: () => {
      // Only the last tick in flight refetches, so earlier answers don't overwrite later clicks.
      if (queryClient.isMutating({ mutationKey }) === 1) {
        void queryClient.invalidateQueries({ queryKey: moduleQuery })
        void queryClient.invalidateQueries({ queryKey: ['modules'] })
      }
    },
  })
}
