import { useQuery } from '@tanstack/react-query'
import { chatApi } from '../../api/chat'
import type { ChatMessage, ChatMessageHistory } from '../../api/types'
import { queryClient } from '../../lib/queryClient'

export const messagesKey = (sessionId: number) => ['chat', 'messages', sessionId] as const

/** 한 번에 불러오는 메시지 수 (서버 최대 50) */
export const MESSAGE_PAGE_SIZE = 50

export const fetchMessages = (sessionId: number) => chatApi.getMessages(sessionId, undefined, MESSAGE_PAGE_SIZE)

export function useMessages(sessionId: number | null) {
  return useQuery({
    queryKey: messagesKey(sessionId ?? 0),
    queryFn: () => fetchMessages(sessionId!),
    enabled: sessionId != null,
    staleTime: 0,
  })
}

/**
 * 위로 더 불러온 메시지
 * - 최신 페이지(messagesKey)는 새 답변이 올 때마다 다시 받으므로, 과거 메시지는 따로 쌓는다
 * - 더 불러올 때 그 순간의 최신 페이지도 함께 담아 둔다
 *   (이후 최신 페이지가 밀려나도 사이가 비지 않게)
 */
export interface OlderMessages {
  messages: ChatMessage[]
  nextBeforeSequenceNo: number | null
  hasOlderMessages: boolean
}

export const olderKey = (sessionId: number) => ['chat', 'older', sessionId] as const

export function useOlderMessages(sessionId: number | null) {
  return useQuery({
    queryKey: olderKey(sessionId ?? 0),
    // 서버에서 받는 값이 아니라 화면에서 쌓는 값이라 다시 받지 않는다
    queryFn: () => queryClient.getQueryData<OlderMessages>(olderKey(sessionId!)) ?? null,
    enabled: false,
    staleTime: Infinity,
    gcTime: 30 * 60 * 1000,
  })
}

/** 지금 화면에 이어 붙일 다음 커서 (없으면 null) */
export function olderCursor(latest: ChatMessageHistory | undefined, older: OlderMessages | null | undefined) {
  if (older) return older.hasOlderMessages ? older.nextBeforeSequenceNo : null
  return latest?.hasOlderMessages ? latest.nextBeforeSequenceNo : null
}

/** 이전 메시지를 한 페이지 더 불러와 앞에 붙인다 */
export async function loadOlderMessages(sessionId: number) {
  const latest = queryClient.getQueryData<ChatMessageHistory>(messagesKey(sessionId))
  const older = queryClient.getQueryData<OlderMessages>(olderKey(sessionId))
  const cursor = olderCursor(latest, older)
  if (cursor == null) return
  const page = await chatApi.getMessages(sessionId, cursor, MESSAGE_PAGE_SIZE)
  queryClient.setQueryData<OlderMessages>(olderKey(sessionId), {
    messages: mergeMessages(page.messages, older?.messages ?? latest?.messages ?? []),
    nextBeforeSequenceNo: page.nextBeforeSequenceNo,
    hasOlderMessages: page.hasOlderMessages,
  })
}

/** 같은 메시지는 뒤쪽(더 최신으로 받은 것)을 쓴다 */
export function mergeMessages(...lists: ChatMessage[][]): ChatMessage[] {
  const byId = new Map<number, ChatMessage>()
  for (const list of lists) for (const m of list) byId.set(m.messageId, m)
  return [...byId.values()].sort((a, b) => a.sequenceNo - b.sequenceNo)
}

/** 최신 페이지 + 위로 불러온 메시지 캐시 모두에서 한 메시지를 고친다 */
export function patchMessage(sessionId: number, messageId: number, patch: (m: ChatMessage) => ChatMessage) {
  const apply = (list: ChatMessage[]) => list.map((m) => (m.messageId === messageId ? patch(m) : m))
  queryClient.setQueryData<ChatMessageHistory>(messagesKey(sessionId), (prev) =>
    prev && { ...prev, messages: apply(prev.messages) },
  )
  queryClient.setQueryData<OlderMessages>(olderKey(sessionId), (prev) =>
    prev && { ...prev, messages: apply(prev.messages) },
  )
}

/** 두 캐시 중 한 메시지 찾기 (최신 페이지 우선) */
export function findMessage(sessionId: number, messageId: number): ChatMessage | undefined {
  const latest = queryClient.getQueryData<ChatMessageHistory>(messagesKey(sessionId))
  const older = queryClient.getQueryData<OlderMessages>(olderKey(sessionId))
  return (
    latest?.messages.find((m) => m.messageId === messageId) ??
    older?.messages.find((m) => m.messageId === messageId)
  )
}
