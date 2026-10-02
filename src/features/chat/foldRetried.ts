import type { ChatMessage } from '../../api/types'

const FAIL_STATUSES = new Set(['FAILED', 'TIMEOUT', 'CANCELLED'])

export const isFailed = (m: ChatMessage) => m.role === 'ASSISTANT' && FAIL_STATUSES.has(m.status)

/**
 * 같은 질문을 다시 보내 재시도한 경우(전용 재시도 API가 생기기 전), 실패한 질문·답 한 쌍은 접어서
 * 대화에는 성공한 쪽만 한 번 보이게 한다.
 */
export function foldRetried(list: ChatMessage[], pendingQuestion: string | null): ChatMessage[] {
  const hidden = new Set<number>()
  list.forEach((m, i) => {
    if (!isFailed(m)) return
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
