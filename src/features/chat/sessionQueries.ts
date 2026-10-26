import { useInfiniteQuery } from '@tanstack/react-query'
import { chatApi } from '../../api/chat'

export const sessionsKey = ['chat', 'sessions'] as const

export function useSessions() {
  return useInfiniteQuery({
    queryKey: sessionsKey,
    queryFn: ({ pageParam }) => chatApi.listSessions(pageParam ?? undefined, 20),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => (last.hasNext ? last.nextCursor : null),
    staleTime: 10_000,
  })
}
