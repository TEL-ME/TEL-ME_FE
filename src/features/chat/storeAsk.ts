import type { ChatMessage } from '../../api/types'

/**
 * 질문과 함께 현재 위치를 보낼 수 있는지.
 * 백엔드가 채팅 좌표 전달(TELME-103)을 받게 되면 VITE_CHAT_GPS=true로 켠다.
 * 꺼져 있으면 "현재 위치 사용" 버튼을 보여 주지 않는다 (좌표를 못 받는 서버에는 눌러도 소용이 없어서).
 */
export const CHAT_GPS_ENABLED = import.meta.env.VITE_CHAT_GPS === 'true'

/** "현재 위치 사용"을 눌렀을 때 좌표와 함께 보내는 말 */
export const NEARBY_QUESTION = '현재 위치에서 가까운 매장을 찾아줘'
/** 지역을 알려 주지 않겠다는 답 */
export const DECLINE_ANSWER = '알려주고 싶지 않아요'

/**
 * 매장을 찾을 지역을 되묻는 말인지.
 * 되묻는 내용 종류를 서버가 따로 주지 않아(문장도 모델이 만든다) 문장에 든 낱말로 고른다.
 */
export function isLocationAsk(message: Pick<ChatMessage, 'messageType' | 'content'> | undefined): boolean {
  return message?.messageType === 'CLARIFICATION' && /매장|지역|위치|근처|동네|어디/.test(message.content ?? '')
}
