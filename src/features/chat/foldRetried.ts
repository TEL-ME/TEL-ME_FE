import type { ChatMessage } from '../../api/types'

const FAIL_STATUSES = new Set(['FAILED', 'TIMEOUT', 'CANCELLED'])

/** 둘 다 답한 질문 번호가 있으면 같아야 한다 (없으면 연달아 온 챗봇 메시지를 같은 질문의 답으로 본다) */
const sameQuestion = (a: ChatMessage, b: ChatMessage) =>
  a.replyToMessageId == null || b.replyToMessageId == null || a.replyToMessageId === b.replyToMessageId

export const isFailed = (m: ChatMessage) => m.role === 'ASSISTANT' && FAIL_STATUSES.has(m.status)

/**
 * 다시 시도한 실패 답변은 접어서 대화에는 다시 만든 답변만 보이게 한다.
 * - 재시도 API(TELME-219): 질문은 그대로 두고 실패 답변 뒤에 새 답변이 붙는다 → 실패 답변만 숨긴다
 *   (새 답변이 생성 중이거나 또 실패해도 마지막 것 하나만 보인다)
 * - 같은 질문을 다시 보낸 경우(예전 방식·직접 다시 입력): 실패한 질문·답 한 쌍을 숨긴다
 */
export function foldRetried(list: ChatMessage[], pendingQuestion: string | null): ChatMessage[] {
  const hidden = new Set<number>()
  list.forEach((m, i) => {
    if (!isFailed(m)) return
    const next = list[i + 1]
    if (next?.role === 'ASSISTANT' && sameQuestion(m, next)) {
      hidden.add(m.messageId)
      return
    }
    const question = list[i - 1]
    if (question?.role !== 'USER') return
    const retried =
      pendingQuestion === question.content ||
      list.slice(i + 1).some((x) => x.role === 'USER' && x.content === question.content)
    if (retried) {
      hidden.add(question.messageId)
      hidden.add(m.messageId)
    }
  })
  return list.filter((m) => !hidden.has(m.messageId))
}
