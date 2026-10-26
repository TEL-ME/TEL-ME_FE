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

const STORE_WORD = /매장|대리점|지점|판매점|직영점/
const HERE_WORD = /(현재|내|제|지금)\s*위치/
/** "근처·주변" 앞에 와도 지역 이름이 아닌 말 */
const NOT_PLACE = new Set(['내', '제', '우리', '저희', '지금', '현재', '여기', '이', '이쪽', '집'])

/**
 * 직접 쓴 질문이 "내 주변 매장"을 찾는 말인지. 맞으면 위치 권한을 받아 좌표를 함께 보낸다.
 * - "현재 위치", "내 위치" + 매장
 * - "근처", "주변" + 매장. 단 "강남역 근처 매장"처럼 앞에 지역 이름이 있으면 아니다
 *   (서버가 좌표를 지역보다 먼저 쓰므로(TELME-127) 좌표를 붙이면 강남역이 아니라 지금 위치로 찾게 된다)
 */
export function wantsNearbyStore(text: string): boolean {
  if (!STORE_WORD.test(text)) return false
  if (HERE_WORD.test(text)) return true
  const words = text.trim().split(/\s+/)
  return words.some((w, i) => /^(근처|주변)/.test(w) && (i === 0 || NOT_PLACE.has(words[i - 1])))
}
