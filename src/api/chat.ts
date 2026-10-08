import { api, apiUrl } from './client'
import type {
  ChatExecutionState,
  ChatFailure,
  ChatMessageHistory,
  ChatMessageSendResponse,
  ChatSession,
  ChatSessionList,
  ChatSources,
} from './types'

const BASE = '/api/v1/chat'

/** 전송마다 새 UUID (randomUUID가 없는 오래된 브라우저·http 환경은 직접 만든다) */
function newRequestId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

/** 질문과 함께 보내는 현재 위치 */
export interface ChatCoordinates {
  latitude: number
  longitude: number
}

export const chatApi = {
  /** 첫 질문을 보낼 때 만든다 (메인·새 대화 화면에는 sessionId가 없다) */
  createSession: (title?: string) => api<ChatSession>(`${BASE}/sessions`, { method: 'POST', body: { title } }),

  listSessions: (cursor?: string, size = 20) =>
    api<ChatSessionList>(`${BASE}/sessions`, { query: { cursor, size } }),

  getMessages: (sessionId: number, beforeSequenceNo?: number, size = 20) =>
    api<ChatMessageHistory>(`${BASE}/sessions/${sessionId}/messages`, { query: { beforeSequenceNo, size } }),

  /**
   * coords는 사용자가 "현재 위치 사용"을 눌렀을 때만 넣는다 (TELME-103).
   * 위도·경도는 둘 다 보내거나 둘 다 보내지 않아야 한다. 서버는 검색에만 쓰고 대화 기록에 남기지 않는다.
   */
  sendMessage: (sessionId: number, content: string, coords?: ChatCoordinates) =>
    api<ChatMessageSendResponse>(`${BASE}/sessions/${sessionId}/messages`, {
      method: 'POST',
      body: {
        content,
        ...(coords ? { latitude: coords.latitude, longitude: coords.longitude } : {}),
        // 같은 전송이 두 번 들어가지 않게 (서버가 같은 requestId는 한 번만 처리)
        requestId: newRequestId(),
      },
    }),

  /**
   * 실패한 답변 다시 생성 (전용 API, 백엔드에 요청 예정 — 경로는 가안).
   * VITE_RETRY_API=true일 때만 쓰고, 그 전에는 chatRunStore가 같은 질문을 다시 보낸다.
   */
  retryMessage: (sessionId: number, messageId: number) =>
    api<ChatMessageSendResponse>(`${BASE}/sessions/${sessionId}/messages/${messageId}/retry`, { method: 'POST' }),

  /** 대화 제목 바꾸기 (공백 제외 1~100자) */
  updateTitle: (sessionId: number, title: string) =>
    api<ChatSession>(`${BASE}/sessions/${sessionId}/title`, { method: 'PATCH', body: { title } }),

  closeSession: (sessionId: number) => api<ChatSession>(`${BASE}/sessions/${sessionId}/close`, { method: 'PATCH' }),

  getSources: (messageId: number) => api<ChatSources>(`${BASE}/messages/${messageId}/sources`),
}

export interface ExecutionHandlers {
  onComplete: (state: ChatExecutionState) => void
  onError: (failure: ChatFailure) => void
  /** 서버 이벤트 없이 연결이 끊긴 경우 (네트워크 등) */
  onDisconnect?: () => void
}

function parseJson<T>(data: unknown): T | null {
  if (typeof data !== 'string') return null
  try {
    return JSON.parse(data) as T
  } catch {
    return null
  }
}

/**
 * 답변 생성 SSE 구독. 새로고침 후에는 메시지 목록의 runningExecutionId로 다시 부른다.
 * complete/error를 받으면 반드시 닫는다 — 안 닫으면 EventSource가 자동 재연결을 반복한다(백엔드 주석).
 * 반환 함수를 부르면 구독을 끊는다.
 */
export function subscribeExecution(sessionId: number, executionId: number, handlers: ExecutionHandlers): () => void {
  const source = new EventSource(apiUrl(`${BASE}/sessions/${sessionId}/executions/${executionId}/subscribe`), {
    withCredentials: true,
  })
  let closed = false
  const close = () => {
    if (closed) return
    closed = true
    source.close()
  }

  source.addEventListener('complete', (e) => {
    close()
    const state = parseJson<ChatExecutionState>((e as MessageEvent).data)
    if (state) handlers.onComplete(state)
  })

  // 서버가 보낸 error 이벤트에는 data가 있고, 연결 자체의 오류에는 없다
  source.addEventListener('error', (e) => {
    const data = (e as MessageEvent).data
    close()
    if (typeof data !== 'string' || !data) {
      handlers.onDisconnect?.()
      return
    }
    const failure =
      parseJson<ChatFailure>(data) ??
      // 같은 실행을 다른 창에서 구독하면 "CONNECTED_ELSEWHERE" 문자열이 온다
      ({ status: 'FAILED', errorCode: data, message: '다른 창에서 이 대화를 보고 있어요.' } satisfies ChatFailure)
    handlers.onError(failure)
  })

  return close
}
