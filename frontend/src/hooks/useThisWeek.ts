import { useQuery } from '@tanstack/react-query'
import { fetchThisWeek } from '../api'

export function useThisWeek() {
  return useQuery({ queryKey: ['this-week'], queryFn: fetchThisWeek })
}
