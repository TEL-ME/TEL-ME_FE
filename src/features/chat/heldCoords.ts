import type { ChatCoordinates } from '../../api/chat'
import type { ChatMessage } from '../../api/types'

/**
 * "현재 위치 사용"으로 보낸 좌표를 되묻기 동안 들고 있는다.
 * 서버는 좌표를 저장하지 않아서, 위치를 보낸 뒤 업무 되묻기("어떤 업무로 매장을 찾으시나요?")에 답할 때
 * 좌표를 다시 붙이지 않으면 지역을 또 물어본다.
 * - 같은 대화에서 마지막 답변이 되묻기(CLARIFICATION)일 때만 다음 전송에 붙인다
 * - 되묻기가 아닌 답변이 오면(대화가 다른 데로 넘어가면) 버린다
 */
let held: { sessionId: number; coords: ChatCoordinates } | null = null

export function rememberCoords(sessionId: number, coords: ChatCoordinates) {
  held = { sessionId, coords }
}

export function forgetCoords() {
  held = null
}

/** 다음 전송에 붙일 좌표. 붙일 때가 아니면 들고 있던 좌표를 버리고 undefined */
export function coordsForNext(
  sessionId: number,
  messages: readonly Pick<ChatMessage, 'role' | 'messageType' | 'sequenceNo'>[] | undefined,
): ChatCoordinates | undefined {
  if (!held || held.sessionId !== sessionId) {
    held = null
    return undefined
  }
  let lastAnswer: Pick<ChatMessage, 'messageType' | 'sequenceNo'> | undefined
  for (const m of messages ?? []) {
    if (m.role === 'ASSISTANT' && (!lastAnswer || m.sequenceNo > lastAnswer.sequenceNo)) lastAnswer = m
  }
  if (lastAnswer?.messageType === 'CLARIFICATION') return held.coords
  held = null
  return undefined
}
