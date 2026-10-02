import { describe, expect, it } from 'vitest'
import type { ChatMessage } from '../../api/types'
import { foldRetried } from './foldRetried'

let seq = 0
const msg = (role: ChatMessage['role'], content: string, status: ChatMessage['status'] = 'COMPLETED'): ChatMessage => {
  seq += 1
  return {
    messageId: seq,
    sequenceNo: seq,
    replyToMessageId: null,
    role,
    messageType: role === 'USER' ? 'QUESTION' : 'ANSWER',
    content,
    status,
    answerBasis: null,
    followUps: null,
    storeResults: null,
    createdAt: new Date().toISOString(),
    completedAt: null,
    ratable: false,
    myFeedback: null,
  }
}

describe('foldRetried', () => {
  it('같은 질문으로 다시 보낸 실패 한 쌍을 숨긴다', () => {
    const list = [msg('USER', '유심'), msg('ASSISTANT', '', 'FAILED'), msg('USER', '유심'), msg('ASSISTANT', '답')]
    const folded = foldRetried(list, null)
    expect(folded.map((m) => m.content)).toEqual(['유심', '답'])
  })

  it('다시 보내는 중(pendingQuestion)에도 실패 한 쌍을 숨긴다', () => {
    const list = [msg('USER', '로밍'), msg('ASSISTANT', '', 'TIMEOUT')]
    expect(foldRetried(list, '로밍')).toEqual([])
  })

  it('재시도하지 않은 실패는 그대로 둔다', () => {
    const list = [msg('USER', '요금제'), msg('ASSISTANT', '', 'FAILED')]
    expect(foldRetried(list, null)).toHaveLength(2)
  })
})
