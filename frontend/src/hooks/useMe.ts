import { useQuery } from '@tanstack/react-query'
import { fetchMe } from '../api'

/** The signed-in user. Fetched once; refreshed by setQueryData after changes, or invalidated on a 401. */
export function useMe() {
  return useQuery({ queryKey: ['me'], queryFn: fetchMe, staleTime: Infinity })
}
