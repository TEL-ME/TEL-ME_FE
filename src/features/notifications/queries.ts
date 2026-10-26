import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { notificationsApi } from '../../api/notifications'
import type { NotificationType } from '../../api/types'
import { queryClient } from '../../lib/queryClient'

export const notificationsKey = ['notifications'] as const
export const unreadCountKey = ['notifications', 'unread-count'] as const

/** 안 읽은 알림 개수 (알림 아이콘의 점). 다른 기기에서 받은 알림도 보이도록 화면에 돌아오면 다시 읽는다 */
export function useUnreadNotifications() {
  return useQuery({
    queryKey: unreadCountKey,
    queryFn: notificationsApi.unreadCount,
    select: (d) => d.unreadCount,
    staleTime: 15_000,
    refetchInterval: 60_000,
    retry: false,
  })
}

export function useNotifications() {
  return useInfiniteQuery({
    queryKey: notificationsKey,
    queryFn: ({ pageParam }) => notificationsApi.list(pageParam ?? undefined, 20),
    initialPageParam: null as number | null,
    getNextPageParam: (last) => (last.hasNext ? last.nextCursor : null),
    staleTime: 0,
  })
}

const refresh = () => void queryClient.invalidateQueries({ queryKey: notificationsKey })

/** 알림 저장. 실패해도 화면 알림(배너·점)은 그대로 두고 조용히 넘어간다 */
export async function saveNotification(type: NotificationType, sessionId: number, messageId: number) {
  try {
    await notificationsApi.save(type, sessionId, messageId)
    refresh()
  } catch {
    // 서버 알림은 보조 기록이라 실패를 사용자에게 알리지 않는다
  }
}

/** 채팅방을 열면 그 방의 알림을 읽음 처리한다 */
export async function readNotificationsOf(sessionId: number) {
  try {
    const { readCount } = await notificationsApi.readSession(sessionId)
    if (readCount > 0) refresh()
  } catch {
    // 남의 대화·삭제된 대화 등은 무시한다
  }
}
