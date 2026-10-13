import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ChatExecutionState } from '../../api/types'
import { useToastStore } from '../../stores/toastStore'
import { notifyAnswer, outcomeOfComplete, useAnswerNotify } from './answerNotifier'

const setVisibility = (state: DocumentVisibilityState) =>
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state })

const complete = (status: ChatExecutionState['status'], messageType?: 'ANSWER' | 'CLARIFICATION'): ChatExecutionState => ({
  sessionId: 1,
  executionId: 10,
  status,
  errorCode: null,
  outputMessage: messageType
    ? { sessionId: 1, executionId: 10, messageId: 5, sequenceNo: 2, messageType, status: 'COMPLETED' }
    : null,
})

describe('outcomeOfComplete', () => {
  it('완료 이벤트를 답변·되묻기·실패로 나눈다', () => {
    expect(outcomeOfComplete(complete('COMPLETED', 'ANSWER'))).toBe('answered')
    expect(outcomeOfComplete(complete('COMPLETED', 'CLARIFICATION'))).toBe('clarify')
    expect(outcomeOfComplete(complete('FAILED'))).toBe('failed')
  })
})

describe('notifyAnswer', () => {
  const NotificationMock = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('Notification', Object.assign(NotificationMock, { permission: 'granted' }))
    useToastStore.setState({ message: null, action: null })
    window.history.replaceState(null, '', '/')
  })

  afterEach(() => {
    NotificationMock.mockReset()
    vi.unstubAllGlobals()
    setVisibility('visible')
    document.dispatchEvent(new Event('visibilitychange'))
    useAnswerNotify.setState({ browserEnabled: false })
  })

  it('그 대화를 보고 있으면 알리지 않는다', () => {
    window.history.replaceState(null, '', '/chat/1')
    notifyAnswer(1, 'answered')
    expect(useToastStore.getState().message).toBeNull()
  })

  it('앱 안의 다른 화면이면 "보기"가 붙은 토스트를 띄운다', () => {
    window.history.replaceState(null, '', '/stores')
    notifyAnswer(1, 'answered')
    expect(useToastStore.getState().message).toBe('답변이 도착했어요')
    expect(useToastStore.getState().action?.label).toBe('보기')
  })

  it('탭이 뒤에 있으면 탭 제목에 도착 수를 붙이고, 설정을 켰을 때만 브라우저 알림을 띄운다', () => {
    const title = 'TEL-ME'
    document.title = title
    setVisibility('hidden')

    notifyAnswer(1, 'answered')
    expect(NotificationMock).not.toHaveBeenCalled()
    expect(document.title).toBe(`(1) ${title}`)

    useAnswerNotify.setState({ browserEnabled: true })
    notifyAnswer(2, 'failed')
    expect(NotificationMock).toHaveBeenCalledWith('TEL-ME', { body: '답변을 만들지 못했어요', tag: 'telme-chat-2' })
    expect(document.title).toBe(`(2) ${title}`)

    setVisibility('visible')
    document.dispatchEvent(new Event('visibilitychange'))
    expect(document.title).toBe(title)
  })
})
