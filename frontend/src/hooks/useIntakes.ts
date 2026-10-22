import { useQuery } from '@tanstack/react-query'
import { fetchIntakes } from '../api'

/** The intakes a student can pick from. They only change when the schedule is re-seeded. */
export function useIntakes() {
  return useQuery({ queryKey: ['intakes'], queryFn: fetchIntakes, staleTime: Infinity })
}
