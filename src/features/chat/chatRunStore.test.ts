import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ExecutionHandlers } from '../../api/chat'
import { ApiError } from '../../api/client'
import type { ChatExecutionState } from '../../api/types'
import { closeLoginSheet, useLoginSheet } from '../auth/loginSheetStore'
import { GUEST_LIMIT_LOGIN_NOTE, GUEST_LIMIT_MESSAGE, liftGuestLimit, useGuestLimit } from './guestLimitStore'

const subs: { sessionId: number; handlers: ExecutionHandlers; stop: ReturnType<typeof vi.fn> }[] = []

// guestLimitStore도 chatApi를 쓰므로 vi.mock보다 먼저 만든다
const chatApi = vi.hoisted(() => ({ sendMessage: vi.fn(), createSession: vi.fn(), getGuestLimit: vi.fn() }))

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

const {
  attachSession,
  resumeExecution,
  sendQuestion,
  stopBackgroundStreams,
  useBackgroundRuns,
  useChatRun,
} = await import('./chatRunStore')
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

describe('게스트가 하루 질문 수를 넘겼을 때 (CHAT429-0)', () => {
  const LIMIT_MESSAGE = '오늘 비회원으로 보낼 수 있는 질문을 모두 사용했습니다.'

  beforeEach(() => {
    attachSession(null)
    stopBackgroundStreams()
    closeLoginSheet()
    liftGuestLimit()
  })

  it('다시 시도 대신 로그인을 안내하고, 한국 시간 0시까지 입력을 막고, 로그인 시트를 연다', async () => {
    chatApi.sendMessage.mockRejectedValueOnce(new ApiError(429, 'CHAT429-0', LIMIT_MESSAGE))
    attachSession(1)
    await sendQuestion('유심 재발급 비용')

    expect(useChatRun.getState()).toMatchObject({ status: 'failed', errorMessage: GUEST_LIMIT_MESSAGE, guestLimited: true })
    expect(useGuestLimit.getState().limitedUntil).toBeGreaterThan(Date.now())
    expect(useLoginSheet.getState()).toMatchObject({ open: true, subtitle: GUEST_LIMIT_LOGIN_NOTE })
  })

  it('다른 이유로 실패하면 로그인을 안내하지 않는다', async () => {
    chatApi.sendMessage.mockRejectedValueOnce(new ApiError(503, 'COMMON503', '잠시 후 다시 시도해 주세요.'))
    attachSession(1)
    await sendQuestion('유심 재발급 비용')

    expect(useChatRun.getState()).toMatchObject({ status: 'failed', guestLimited: false })
    expect(useGuestLimit.getState().limitedUntil).toBeNull()
    expect(useLoginSheet.getState().open).toBe(false)
  })
})

describe('게스트 남은 질문 수 (TELME-213 후속)', () => {
  beforeEach(() => {
    attachSession(null)
    stopBackgroundStreams()
    closeLoginSheet()
    liftGuestLimit()
    subs.length = 0
    chatApi.sendMessage.mockReset()
    chatApi.createSession.mockReset()
    chatApi.getGuestLimit.mockReset()
  })

  it('전송 응답의 남은 수로 갱신하고, 0이 되면 다음 질문 전에 바로 잠근다', async () => {
    chatApi.sendMessage.mockResolvedValueOnce({ sessionId: 1, messageId: 5, executionId: 10, guestQuestionsRemaining: 2 })
    attachSession(1)
    await sendQuestion('유심 재발급 비용')
    expect(useGuestLimit.getState()).toMatchObject({ remaining: 2, limitedUntil: null })

    chatApi.sendMessage.mockResolvedValueOnce({ sessionId: 1, messageId: 7, executionId: 11, guestQuestionsRemaining: 0 })
    useChatRun.setState({ status: 'idle' })
    await sendQuestion('로밍 신청')
    expect(useGuestLimit.getState().remaining).toBe(0)
    expect(useGuestLimit.getState().limitedUntil).toBeGreaterThan(Date.now())
    // 10번째 질문은 정상 접수라 로그인 시트를 띄우지 않는다
    expect(useLoginSheet.getState().open).toBe(false)
  })

  it('잠겨 있으면 서버에 보내지 않고 로그인만 안내한다', async () => {
    useGuestLimit.setState({ remaining: 0, limitedUntil: Date.now() + 60_000 })
    attachSession(1)
    await sendQuestion('유심 재발급 비용')
    expect(chatApi.sendMessage).not.toHaveBeenCalled()
    expect(useLoginSheet.getState()).toMatchObject({ open: true, subtitle: GUEST_LIMIT_LOGIN_NOTE })
  })

  it('새 대화의 첫 질문이 한도에 걸리면 빈 대화로 옮기지 않고 홈에 남는다', async () => {
    chatApi.createSession.mockResolvedValueOnce({ sessionId: 99 })
    chatApi.sendMessage.mockRejectedValueOnce(new ApiError(429, 'CHAT429-0', '한도'))
    chatApi.getGuestLimit.mockResolvedValueOnce({ limited: true, dailyLimit: 10, remaining: 0, resetsAt: '2099-01-01T15:00:00Z' })
    const moved = vi.fn()
    await sendQuestion('유심 재발급 비용', moved)

    expect(moved).not.toHaveBeenCalled()
    expect(useChatRun.getState()).toMatchObject({ sessionId: null, pendingQuestion: null, guestLimited: true })
    expect(useLoginSheet.getState().open).toBe(true)
    await vi.waitFor(() => expect(useGuestLimit.getState().limitedUntil).toBe(Date.parse('2099-01-01T15:00:00Z')))
  })

  it('새 대화는 질문이 접수된 뒤에 주소를 바꾼다', async () => {
    chatApi.createSession.mockResolvedValueOnce({ sessionId: 99 })
    chatApi.sendMessage.mockResolvedValueOnce({ sessionId: 99, messageId: 5, executionId: 10, guestQuestionsRemaining: 9 })
    const moved = vi.fn()
    await sendQuestion('유심 재발급 비용', moved)
    expect(moved).toHaveBeenCalledWith(99)
  })

  it('답이 실패하면(실패한 질문은 세지 않음) 게스트 남은 수를 다시 받는다', async () => {
    chatApi.sendMessage.mockResolvedValueOnce({ sessionId: 1, messageId: 5, executionId: 10, guestQuestionsRemaining: 4 })
    chatApi.getGuestLimit.mockResolvedValueOnce({ limited: true, dailyLimit: 10, remaining: 5, resetsAt: '2099-01-01T15:00:00Z' })
    attachSession(1)
    await sendQuestion('유심 재발급 비용')
    await subs[0].handlers.onError({ status: 'FAILED', errorCode: 'MODEL_ERROR', message: '답변을 만들지 못했어요' })
    expect(chatApi.getGuestLimit).toHaveBeenCalledTimes(1)
    await vi.waitFor(() => expect(useGuestLimit.getState().remaining).toBe(5))
  })
})
