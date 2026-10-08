import type { ChatMessage } from '../../api/types'

/**
 * 질문과 함께 현재 위치를 보낼 수 있는지 (백엔드 TELME-103). 기본으로 켜져 있다.
 * 좌표를 받지 못하는 백엔드에 붙일 때만 VITE_CHAT_GPS=false로 끈다.
 * 끄면 "현재 위치 사용" 버튼을 보여 주지 않는다 (눌러도 서버가 좌표를 무시하고 지역을 다시 묻기 때문에).
 */
export const CHAT_GPS_ENABLED = import.meta.env.VITE_CHAT_GPS !== 'false'

/** "현재 위치 사용"을 눌렀을 때 좌표와 함께 보내는 말 */
export const NEARBY_QUESTION = '현재 위치에서 가까운 매장을 찾아줘'
/** 지역을 알려 주지 않겠다는 답 */
export const DECLINE_ANSWER = '알려주고 싶지 않아요'

type AskMessage = Pick<ChatMessage, 'messageType' | 'content'> & Partial<Pick<ChatMessage, 'followUps'>>

/** 선택지를 함께 주는 되묻기인지 (예: 업무 되묻기 → followUps에 "유심 재발급", "번호이동"…). 버튼 글자를 그대로 보낸다 */
export function hasChoices(message: AskMessage | undefined): boolean {
  return message?.messageType === 'CLARIFICATION' && !!message.followUps?.some((s) => s.trim())
}

/**
 * 매장을 찾을 지역을 되묻는 말인지.
 * 되묻는 내용 종류를 서버가 따로 주지 않아(문장도 모델이 만든다) 문장에 든 낱말로 고른다.
 * 선택지(followUps)가 있으면 지역 되묻기가 아니다 — 지역 되묻기는 선택지가 비어 있다 (TELME-129)
 */
export function isLocationAsk(message: AskMessage | undefined): boolean {
  return (
    message?.messageType === 'CLARIFICATION' &&
    !hasChoices(message) &&
    /매장|지역|위치|근처|동네|어디/.test(message.content ?? '')
  )
}
