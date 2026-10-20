import { api } from './client'
import type { AppNotification, NotificationList, NotificationType } from './types'

const BASE = '/api/v1/chat/notifications'

export const notificationsApi = {
  /** 다른 화면·뒤에 있는 탭에서 답변을 받았을 때 저장한다. 같은 메시지는 한 번만 저장된다 */
  save: (type: NotificationType, sessionId: number, messageId: number) =>
    api<AppNotification>(BASE, { method: 'POST', body: { type, sessionId, messageId } }),

  list: (cursor?: number, size = 20) => api<NotificationList>(BASE, { query: { cursor, size } }),

  unreadCount: () => api<{ unreadCount: number }>(`${BASE}/unread-count`),

  /** 채팅방에 들어가면 그 방의 알림을 모두 읽음 처리한다 */
  readSession: (sessionId: number) =>
    api<{ readCount: number }>(`${BASE}/read`, { method: 'PATCH', query: { sessionId } }),
}
