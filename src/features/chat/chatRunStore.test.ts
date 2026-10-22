import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ExecutionHandlers } from '../../api/chat'
import { ApiError } from '../../api/client'
import type { ChatExecutionState } from '../../api/types'
import { closeLoginSheet, useLoginSheet } from '../auth/loginSheetStore'
import { GUEST_LIMIT_LOGIN_NOTE, GUEST_LIMIT_MESSAGE, liftGuestLimit, useGuestLimit } from './guestLimitStore'

const subs: { sessionId: number; executionId: number; handlers: ExecutionHandlers; stop: ReturnType<typeof vi.fn> }[] = []

// guestLimitStore도 chatApi를 쓰므로 vi.mock보다 먼저 만든다
const chatApi = vi.hoisted(() => ({
  sendMessage: vi.fn(),
  createSession: vi.fn(),
  getGuestLimit: vi.fn(),
  retryExecution: vi.fn(),
}))

vi.mock('../../api/chat', () => ({
  chatApi,
  subscribeExecution: (sessionId: number, executionId: number, handlers: ExecutionHandlers) => {
    const stop = vi.fn()
    subs.push({ sessionId, executionId, handlers, stop })
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
  retryAnswer,
  sendQuestion,
  stopBackgroundStreams,
  useBackgroundRuns,
  useChatRun,
} = await import('./chatRunStore')
const { coordsForNext, forgetCoords } = await import('./heldCoords')
const { notifyAnswer } = await import('./answerNotifier')
const { useToastStore } = await import('../../stores/toastStore')

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

describe('답변 다시 시도 (TELME-219)', () => {
  const here = { latitude: 37.5, longitude: 127.0 }

  beforeEach(() => {
    attachSession(null)
    stopBackgroundStreams()
    closeLoginSheet()
    liftGuestLimit()
    forgetCoords()
    sessionStorage.clear()
    subs.length = 0
    chatApi.sendMessage.mockReset()
    chatApi.retryExecution.mockReset()
  })

  it('서버가 자동으로 다시 시도하는 동안 안내를 띄우고, 답이 끝나면 내린다', async () => {
    attachSession(1)
    resumeExecution(1, 10)
    subs[0].handlers.onStatus?.('RETRYING')
    expect(useChatRun.getState().retrying).toBe(true)

    await subs[0].handlers.onComplete(done(1))
    expect(useChatRun.getState().retrying).toBe(false)
  })

  it('실패로 끝나도 안내를 내린다', async () => {
    attachSession(1)
    resumeExecution(1, 10)
    subs[0].handlers.onStatus?.('RETRYING')
    await subs[0].handlers.onError({ status: 'FAILED', errorCode: 'LLM502-4', message: '답변 생성에 실패했습니다.', retryable: true })
    expect(useChatRun.getState()).toMatchObject({ status: 'failed', retrying: false })
  })

  it('재시도 API로 같은 질문에 새 실행을 붙이고, 그 실행을 구독한다', async () => {
    chatApi.retryExecution.mockResolvedValueOnce({ sessionId: 1, messageId: 5, executionId: 11 })
    attachSession(1)
    useChatRun.setState({ status: 'failed' })
    await retryAnswer('유심 재발급 비용', 10)

    expect(chatApi.retryExecution).toHaveBeenCalledWith(1, 10, undefined)
    expect(chatApi.sendMessage).not.toHaveBeenCalled()
    expect(subs.at(-1)).toMatchObject({ sessionId: 1, executionId: 11 })
    expect(useChatRun.getState()).toMatchObject({ status: 'thinking', pendingQuestion: null })
  })

  it('위치와 함께 보낸 질문이면 다시 시도할 때도 좌표를 붙인다', async () => {
    chatApi.sendMessage.mockResolvedValueOnce({ sessionId: 1, messageId: 5, executionId: 10 })
    chatApi.retryExecution.mockResolvedValueOnce({ sessionId: 1, messageId: 5, executionId: 11 })
    attachSession(1)
    await sendQuestion('근처 매장', undefined, here)
    await subs[0].handlers.onError({ status: 'FAILED', errorCode: 'LLM502-4', message: '실패', retryable: true })
    await retryAnswer('근처 매장', 10)
    expect(chatApi.retryExecution).toHaveBeenCalledWith(1, 10, here)
  })

  it('다른 대화에 갔다 오거나 새로고침한 뒤에도 위치 질문은 좌표를 붙여 다시 시도한다', async () => {
    chatApi.sendMessage.mockResolvedValueOnce({ sessionId: 1, messageId: 5, executionId: 10 })
    chatApi.retryExecution.mockResolvedValueOnce({ sessionId: 1, messageId: 5, executionId: 11 })
    attachSession(1)
    await sendQuestion('근처 매장', undefined, here)
    await subs[0].handlers.onError({ status: 'FAILED', errorCode: 'LLM502-4', message: '실패', retryable: true })
    // 대화 이동 (새로고침도 메모리가 비는 것은 같다)
    attachSession(2)
    attachSession(1)
    await retryAnswer('근처 매장', 10)
    expect(chatApi.retryExecution).toHaveBeenCalledWith(1, 10, here)
    // 다시 시도는 한 번뿐이라 접수되면 지운다
    expect(sessionStorage.getItem('telme.retryCoords')).toBeNull()
  })

  it('여러 대화에서 위치 질문을 동시에 보내도 실패한 대화의 좌표로 다시 시도한다', async () => {
    const there = { latitude: 35.1, longitude: 129.0 }
    chatApi.sendMessage
      .mockResolvedValueOnce({ sessionId: 1, messageId: 5, executionId: 10 })
      .mockResolvedValueOnce({ sessionId: 2, messageId: 6, executionId: 20 })
    chatApi.retryExecution.mockResolvedValueOnce({ sessionId: 1, messageId: 5, executionId: 11 })
    // A에서 위치 질문 → 답변을 기다리는 중에 B로 옮겨 B에서도 위치 질문
    attachSession(1)
    await sendQuestion('근처 매장', undefined, here)
    attachSession(2)
    await sendQuestion('근처 매장', undefined, there)
    // A가 백그라운드에서 실패하고, A로 돌아와 다시 시도
    await subs[0].handlers.onError({ status: 'FAILED', errorCode: 'LLM502-4', message: '실패', retryable: true })
    attachSession(1)
    await retryAnswer('근처 매장', 10)

    expect(chatApi.retryExecution).toHaveBeenCalledWith(1, 10, here)
    // B의 좌표는 그대로 남는다
    const { retryCoordsFor } = await import('./retryCoords')
    expect(retryCoordsFor(2, 20)).toEqual(there)
    expect(retryCoordsFor(1, 10)).toBeUndefined()
  })

  it('답변이 정상으로 끝나면 보관한 좌표를 지운다', async () => {
    chatApi.sendMessage.mockResolvedValueOnce({ sessionId: 1, messageId: 5, executionId: 10 })
    attachSession(1)
    await sendQuestion('근처 매장', undefined, here)
    expect(sessionStorage.getItem('telme.retryCoords')).not.toBeNull()
    await subs[0].handlers.onComplete(done(1))
    expect(sessionStorage.getItem('telme.retryCoords')).toBeNull()
  })

  it('게스트 한도에 걸려 있어도 다시 시도는 막지 않는다 (질문 수에 세지 않음)', async () => {
    useGuestLimit.setState({ remaining: 0, limitedUntil: Date.now() + 60_000 })
    chatApi.retryExecution.mockResolvedValueOnce({ sessionId: 1, messageId: 5, executionId: 11 })
    attachSession(1)
    await retryAnswer('유심 재발급 비용', 10)
    expect(chatApi.retryExecution).toHaveBeenCalled()
    expect(useLoginSheet.getState().open).toBe(false)
  })

  it('이미 다시 시도한 질문이면(CHAT409-6) 서버 안내를 띄우고 멈춘다', async () => {
    chatApi.retryExecution.mockRejectedValueOnce(new ApiError(409, 'CHAT409-6', '이미 다시 시도한 질문입니다.'))
    attachSession(1)
    await retryAnswer('유심 재발급 비용', 10)
    expect(useToastStore.getState().message).toBe('이미 다시 시도한 질문입니다.')
    expect(useChatRun.getState().status).toBe('idle')
    expect(subs).toHaveLength(0)
  })

  it('질문이 저장되기 전에 실패했으면 같은 질문을 처음부터 다시 보낸다', async () => {
    chatApi.sendMessage.mockResolvedValueOnce({ sessionId: 1, messageId: 5, executionId: 10 })
    attachSession(1)
    await retryAnswer('유심 재발급 비용', null)
    expect(chatApi.retryExecution).not.toHaveBeenCalled()
    expect(chatApi.sendMessage).toHaveBeenCalledWith(1, '유심 재발급 비용', undefined)
  })
})
