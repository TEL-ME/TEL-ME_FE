import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ExecutionHandlers } from '../../api/chat'
import type { ChatExecutionState } from '../../api/types'

const subs: { sessionId: number; handlers: ExecutionHandlers; stop: ReturnType<typeof vi.fn> }[] = []

vi.mock('../../api/chat', () => ({
  chatApi: {},
  subscribeExecution: (sessionId: number, _executionId: number, handlers: ExecutionHandlers) => {
    const stop = vi.fn()
    subs.push({ sessionId, handlers, stop })
    return stop
  },
}))
vi.mock('./queries', () => ({
  messagesKey: (id: number) => ['chat', 'messages', id],
  fetchMessages: vi.fn(),
}))
vi.mock('./answerNotifier', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./answerNotifier')>()),
  notifyAnswer: vi.fn(),
}))

const { attachSession, resumeExecution, stopBackgroundStreams, useBackgroundRuns, useChatRun } = await import('./chatRunStore')
const { notifyAnswer } = await import('./answerNotifier')

const done = (sessionId: number): ChatExecutionState => ({
  sessionId,
  executionId: 10,
  status: 'COMPLETED',
  errorCode: null,
  outputMessage: { sessionId, executionId: 10, messageId: 7, sequenceNo: 2, messageType: 'ANSWER', status: 'COMPLETED' },
})

describe('답변을 기다리던 대화를 떠났을 때', () => {
  beforeEach(() => {
    attachSession(null)
    stopBackgroundStreams()
    subs.length = 0
    vi.mocked(notifyAnswer).mockClear()
  })

  it('구독을 끊지 않고, 답변이 오면 알린다', async () => {
    attachSession(1)
    resumeExecution(1, 10)
    attachSession(2)

    expect(subs[0].stop).not.toHaveBeenCalled()
    expect(useChatRun.getState()).toMatchObject({ sessionId: 2, status: 'idle' })
    expect(useBackgroundRuns.getState().ids).toEqual([1])

    await subs[0].handlers.onComplete(done(1))
    expect(notifyAnswer).toHaveBeenCalledWith(1, 'answered')
    expect(useBackgroundRuns.getState().ids).toEqual([])
    // 지금 보는 대화의 상태는 건드리지 않는다
    expect(useChatRun.getState()).toMatchObject({ sessionId: 2, status: 'idle' })
  })

  it('그 대화로 돌아오면 다시 구독하지 않고 이어 받는다', async () => {
    attachSession(1)
    resumeExecution(1, 10)
    attachSession(2)
    attachSession(1)

    expect(useChatRun.getState()).toMatchObject({ sessionId: 1, status: 'thinking' })
    expect(useBackgroundRuns.getState().ids).toEqual([])
    resumeExecution(1, 10)
    expect(subs).toHaveLength(1)

    await subs[0].handlers.onComplete(done(1))
    expect(useChatRun.getState()).toMatchObject({ sessionId: 1, status: 'streaming', typingMessageId: 7 })
  })

  it('로그아웃하면 백그라운드 구독을 끊는다', () => {
    attachSession(1)
    resumeExecution(1, 10)
    attachSession(null)
    stopBackgroundStreams()
    expect(subs[0].stop).toHaveBeenCalled()
  })

  it('다른 창에서 보고 있다는 이유로 끊긴 것은 알리지 않는다', async () => {
    attachSession(1)
    resumeExecution(1, 10)
    attachSession(2)
    await subs[0].handlers.onError({ status: 'FAILED', errorCode: 'CONNECTED_ELSEWHERE', message: '' })
    expect(notifyAnswer).not.toHaveBeenCalled()
  })
})
