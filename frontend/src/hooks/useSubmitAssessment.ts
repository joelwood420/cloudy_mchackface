import { useMutation, useQueryClient } from '@tanstack/react-query'
import { type AssessmentWithModule, type ModuleDetail, type ThisWeek, setAssessmentSubmitted } from '../api'
import { withAssessmentSubmitted } from '../progress'

const CACHES = ['assessments', 'this-week', 'module'] as const
const mutationKey = ['submit-assessment']

/** Tick or untick "submitted": update every cached list straight away, undo on error, sync once quiet. */
export function useSubmitAssessment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey,
    mutationFn: ({ key, submitted }: { key: string; submitted: boolean }) => setAssessmentSubmitted(key, submitted),
    onMutate: async ({ key, submitted }) => {
      await Promise.all(CACHES.map((k) => queryClient.cancelQueries({ queryKey: [k] })))
      const snapshot = CACHES.flatMap((k) => queryClient.getQueriesData({ queryKey: [k] }))
      queryClient.setQueryData<AssessmentWithModule[]>(['assessments'], (old) => old && withAssessmentSubmitted(old, key, submitted))
      queryClient.setQueryData<ThisWeek>(['this-week'], (old) => old && { ...old, assessments: withAssessmentSubmitted(old.assessments, key, submitted) })
      queryClient.setQueriesData<ModuleDetail>({ queryKey: ['module'] }, (old) => old && { ...old, assessments: withAssessmentSubmitted(old.assessments, key, submitted) })
      return { snapshot }
    },
    onError: (_error, _vars, context) => {
      context?.snapshot.forEach(([queryKey, data]) => queryClient.setQueryData(queryKey, data))
    },
    onSettled: () => {
      if (queryClient.isMutating({ mutationKey }) !== 1) return
      CACHES.forEach((k) => void queryClient.invalidateQueries({ queryKey: [k] }))
    },
  })
}
