import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ExecutionHandlers } from '../../api/chat'
import type { ChatExecutionState } from '../../api/types'

const subs: { sessionId: number; handlers: ExecutionHandlers; stop: ReturnType<typeof vi.fn> }[] = []

const chatApi = { sendMessage: vi.fn() }

vi.mock('../../api/chat', () => ({
  chatApi,
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

const { attachSession, resumeExecution, sendQuestion, stopBackgroundStreams, useBackgroundRuns, useChatRun } = await import('./chatRunStore')
const { coordsForNext, forgetCoords } = await import('./heldCoords')
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
    expect(notifyAnswer).toHaveBeenCalledWith(1, 'answered', 7)
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

describe('질문을 보내는 중(서버 응답 전)에 다른 대화로 옮겼을 때', () => {
  const here = { latitude: 37.5, longitude: 127.0 }
  const clarify = [{ role: 'ASSISTANT' as const, messageType: 'CLARIFICATION' as const, sequenceNo: 2 }]

  beforeEach(() => {
    attachSession(null)
    stopBackgroundStreams()
    forgetCoords()
    subs.length = 0
    vi.mocked(notifyAnswer).mockClear()
  })

  it('백그라운드에서 답변을 기다렸다가 알리고, 보낸 좌표는 그 대화에 남긴다', async () => {
    let respond!: (v: unknown) => void
    chatApi.sendMessage.mockReturnValueOnce(new Promise((r) => (respond = r)))
    attachSession(1)
    const sending = sendQuestion('근처 매장', undefined, here)
    await Promise.resolve()
    attachSession(2)
    respond({ sessionId: 1, messageId: 5, executionId: 10, inputGuard: null })
    await sending

    expect(useBackgroundRuns.getState().ids).toEqual([1])
    expect(useChatRun.getState()).toMatchObject({ sessionId: 2, status: 'idle' })
    expect(coordsForNext(1, clarify)).toEqual(here)

    await subs[0].handlers.onComplete(done(1))
    expect(notifyAnswer).toHaveBeenCalledWith(1, 'answered', 7)
    expect(useBackgroundRuns.getState().ids).toEqual([])
  })

  it('답변을 기다리지 않는 대화를 떠나면 좌표를 버린다', async () => {
    chatApi.sendMessage.mockResolvedValueOnce({ sessionId: 1, messageId: 5, executionId: null, inputGuard: null })
    attachSession(1)
    await sendQuestion('근처 매장', undefined, here)
    attachSession(2)
    attachSession(1)
    expect(coordsForNext(1, clarify)).toBeUndefined()
  })
})
