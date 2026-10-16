import { type QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { type ThisWeek, fetchThisWeek, setPrerequisiteDone, setTaskDone } from '../api'
import { withThisWeekPrerequisiteDone, withThisWeekTaskDone } from '../progress'

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

function useOptimisticThisWeek<V>(mutationFn: (v: V) => Promise<void>, apply: (tw: ThisWeek, v: V) => ThisWeek) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey,
    mutationFn,
    onMutate: async (vars: V) => {
      await queryClient.cancelQueries({ queryKey: thisWeekKey })
      const previous = queryClient.getQueryData<ThisWeek>(thisWeekKey)
      if (previous) queryClient.setQueryData(thisWeekKey, apply(previous, vars))
      return { previous }
    },
    onError: (_e, _v, context) => {
      if (context?.previous) queryClient.setQueryData(thisWeekKey, context.previous)
    },
    onSettled: () => settle(queryClient),
  })
}

export const useTickThisWeekTask = () =>
  useOptimisticThisWeek(
    ({ taskKey, done }: { taskKey: string; done: boolean }) => setTaskDone(taskKey, done),
    (tw, { taskKey, done }) => withThisWeekTaskDone(tw, taskKey, done),
  )

export const useTickThisWeekPrerequisite = () =>
  useOptimisticThisWeek(
    ({ prerequisiteKey, completed }: { prerequisiteKey: string; completed: boolean }) => setPrerequisiteDone(prerequisiteKey, completed),
    (tw, { prerequisiteKey, completed }) => withThisWeekPrerequisiteDone(tw, prerequisiteKey, completed),
  )
