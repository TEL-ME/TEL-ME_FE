import type { ChatCoordinates } from '../../api/chat'

/**
 * 위치를 붙여 보낸 질문의 좌표를 "다시 시도"할 수 있는 동안만 보관한다 (TELME-25).
 * 서버는 좌표를 저장하지 않아서 재시도할 때 다시 보내야 하는데, 메모리에만 두면
 * 새로고침하거나 다른 대화에 다녀오면 사라진다. 탭을 닫으면 지워지도록 sessionStorage에 둔다.
 * 여러 대화의 답변을 백그라운드에서 동시에 기다릴 수 있으므로 대화·실행(sessionId + executionId)마다 따로 둔다.
 * - 그 실행의 재시도가 접수되거나(질문당 한 번) 답변이 정상으로 끝나면 그 실행 것만 지운다
 * - 로그아웃하면 모두 지운다
 * 서버의 재시도 가능 상태(retryableExecutionId)에는 기한이 없으므로 따로 만료시키지 않는다.
 * 기한을 두면 버튼은 남는데 좌표만 사라져 위치 없이 재시도된다. 탭을 닫으면 sessionStorage째 지워진다.
 */
const KEY = 'telme.retryCoords'
/** 비정상적으로 쌓이지 않게 최근 것만 남긴다 (대화마다 재시도 가능한 실행은 마지막 하나뿐이라 넉넉하다) */
const MAX_ENTRIES = 50

interface Saved {
  sessionId: number
  executionId: number
  latitude: number
  longitude: number
}

const same = (s: Saved, sessionId: number, executionId: number) =>
  s.sessionId === sessionId && s.executionId === executionId

function readAll(): Saved[] {
  try {
    const parsed: unknown = JSON.parse(sessionStorage.getItem(KEY) ?? '[]')
    return Array.isArray(parsed) ? (parsed as Saved[]).filter(Boolean) : []
  } catch {
    return []
  }
}

function writeAll(list: Saved[]) {
  try {
    if (list.length === 0) sessionStorage.removeItem(KEY)
    else sessionStorage.setItem(KEY, JSON.stringify(list.slice(-MAX_ENTRIES)))
  } catch {
    // 저장할 수 없는 환경(사파리 개인 정보 보호 모드 등)이면 같은 화면에서만 다시 붙는다
  }
}

export function saveRetryCoords(sessionId: number, executionId: number, coords: ChatCoordinates) {
  const list = readAll().filter((s) => !same(s, sessionId, executionId))
  list.push({ sessionId, executionId, latitude: coords.latitude, longitude: coords.longitude })
  writeAll(list)
}

/** 그 실행을 다시 시도할 때 붙일 좌표. 위치를 붙이지 않은 질문이면 undefined */
export function retryCoordsFor(sessionId: number, executionId: number): ChatCoordinates | undefined {
  const saved = readAll().find((s) => same(s, sessionId, executionId))
  return saved ? { latitude: saved.latitude, longitude: saved.longitude } : undefined
}

/** 그 실행의 좌표만 지운다 */
export function clearRetryCoords(sessionId: number, executionId: number) {
  writeAll(readAll().filter((s) => !same(s, sessionId, executionId)))
}

/** 로그아웃 등: 모두 지운다 */
export function clearAllRetryCoords() {
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    // 무시
  }
}
