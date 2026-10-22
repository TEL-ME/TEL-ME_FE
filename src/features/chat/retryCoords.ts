import type { ChatCoordinates } from '../../api/chat'

/**
 * 위치를 붙여 보낸 질문의 좌표를 "다시 시도"할 수 있는 동안만 보관한다 (TELME-25).
 * 서버는 좌표를 저장하지 않아서 재시도할 때 다시 보내야 하는데, 메모리에만 두면
 * 새로고침하거나 다른 대화에 다녀오면 사라진다. 탭을 닫으면 지워지도록 sessionStorage에 하나만 둔다.
 * - 재시도 요청이 접수되거나(질문당 한 번) 답변이 정상으로 끝나면 지운다
 * - 로그아웃하면 지운다
 * - 30분이 지나면 쓰지 않는다
 */
const KEY = 'telme.retryCoords'
export const RETRY_COORDS_TTL_MS = 30 * 60 * 1000

interface Saved {
  sessionId: number
  executionId: number
  latitude: number
  longitude: number
  savedAt: number
}

function read(): Saved | null {
  try {
    return JSON.parse(sessionStorage.getItem(KEY) ?? 'null') as Saved | null
  } catch {
    return null
  }
}

export function saveRetryCoords(sessionId: number, executionId: number, coords: ChatCoordinates) {
  try {
    const saved: Saved = { sessionId, executionId, latitude: coords.latitude, longitude: coords.longitude, savedAt: Date.now() }
    sessionStorage.setItem(KEY, JSON.stringify(saved))
  } catch {
    // 저장할 수 없는 환경(사파리 개인 정보 보호 모드 등)이면 같은 화면에서만 다시 붙는다
  }
}

/** 그 실행을 다시 시도할 때 붙일 좌표. 없거나 오래됐으면 undefined */
export function retryCoordsFor(sessionId: number, executionId: number): ChatCoordinates | undefined {
  const saved = read()
  if (!saved || saved.sessionId !== sessionId || saved.executionId !== executionId) return undefined
  if (Date.now() - saved.savedAt > RETRY_COORDS_TTL_MS) {
    clearRetryCoords()
    return undefined
  }
  return { latitude: saved.latitude, longitude: saved.longitude }
}

/** executionId를 주면 그 실행의 좌표일 때만 지운다 */
export function clearRetryCoords(sessionId?: number, executionId?: number) {
  try {
    if (sessionId != null && executionId != null) {
      const saved = read()
      if (!saved || saved.sessionId !== sessionId || saved.executionId !== executionId) return
    }
    sessionStorage.removeItem(KEY)
  } catch {
    // 무시
  }
}
