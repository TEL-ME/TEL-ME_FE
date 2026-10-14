import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ChatExecutionState } from '../../api/types'
import { queryClient } from '../../lib/queryClient'
import {
  browserNotifySupported,
  clearUnread,
  dismissBannersOf,
  notifyAnswer,
  outcomeOfComplete,
  sessionTitleFor,
  useAnswerBanners,
  useAnswerNotify,
  useUnreadAnswers,
} from './answerNotifier'

const listSessions = vi.fn()
const getMessages = vi.fn()
vi.mock('../../api/chat', () => ({ chatApi: { listSessions: (...a: unknown[]) => listSessions(...a), getMessages: (...a: unknown[]) => getMessages(...a) } }))

const sessionsPage = (titles: Record<number, string | null>) => ({
  sessions: Object.entries(titles).map(([id, title]) => ({ sessionId: Number(id), title, status: 'ACTIVE', createdAt: '', lastActiveAt: '' })),
  nextCursor: null,
  hasNext: false,
})

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
  it('완료 이벤트를 답변·되묻기·실패로 나눈다', async () => {
    expect(outcomeOfComplete(complete('COMPLETED', 'ANSWER'))).toBe('answered')
    expect(outcomeOfComplete(complete('COMPLETED', 'CLARIFICATION'))).toBe('clarify')
    expect(outcomeOfComplete(complete('FAILED'))).toBe('failed')
  })
})

describe('notifyAnswer', () => {
  const NotificationMock = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('Notification', Object.assign(NotificationMock, { permission: 'granted' }))
    useAnswerBanners.setState({ items: [] })
    queryClient.clear()
    listSessions.mockResolvedValue(sessionsPage({ 1: '요금제 변경 문의', 2: '유심 재발급', 3: null }))
    getMessages.mockResolvedValue({ messages: [], runningExecutionId: null })
    window.history.replaceState(null, '', '/')
    vi.spyOn(document, 'hasFocus').mockReturnValue(true)
  })

  afterEach(() => {
    NotificationMock.mockReset()
    vi.unstubAllGlobals()
    setVisibility('visible')
    document.dispatchEvent(new Event('visibilitychange'))
    useAnswerNotify.setState({ browserEnabled: false })
    useUnreadAnswers.setState({ ids: [] })
  })

  it('보고 있지 않은 대화의 답변만 도착 표시를 남기고, 그 대화를 열면 지운다', async () => {
    window.history.replaceState(null, '', '/chat/1')
    await notifyAnswer(1, 'answered')
    expect(useUnreadAnswers.getState().ids).toEqual([])

    window.history.replaceState(null, '', '/stores')
    await notifyAnswer(1, 'answered')
    await notifyAnswer(1, 'answered')
    await notifyAnswer(2, 'failed')
    expect(useUnreadAnswers.getState().ids).toEqual([1, 2])

    clearUnread(1)
    expect(useUnreadAnswers.getState().ids).toEqual([2])
  })

  it('그 대화를 보고 있으면 알리지 않는다', async () => {
    window.history.replaceState(null, '', '/chat/1')
    await notifyAnswer(1, 'answered')
    expect(useAnswerBanners.getState().items).toEqual([])
  })

  it('앱 안의 다른 화면이면 대화 제목과 결과로 위 알림을 띄우고, 새 알림이 위로 쌓인다', async () => {
    window.history.replaceState(null, '', '/stores')
    await notifyAnswer(1, 'answered')
    await notifyAnswer(2, 'clarify')
    expect(useAnswerBanners.getState().items.map((b) => [b.title, b.outcome])).toEqual([
      ['유심 재발급', 'clarify'],
      ['요금제 변경 문의', 'answered'],
    ])
    // 같은 대화의 알림은 하나만 남기고, 그 대화를 열면 내린다
    await notifyAnswer(1, 'failed')
    expect(useAnswerBanners.getState().items.map((b) => [b.sessionId, b.outcome])).toEqual([
      [1, 'failed'],
      [2, 'clarify'],
    ])
    dismissBannersOf(2)
    expect(useAnswerBanners.getState().items.map((b) => b.sessionId)).toEqual([1])
  })

  it('알림은 세 개까지만 보인다', async () => {
    window.history.replaceState(null, '', '/stores')
    for (const id of [1, 2, 3, 4]) await notifyAnswer(id, 'answered')
    expect(useAnswerBanners.getState().items.map((b) => b.sessionId)).toEqual([4, 3, 2])
  })

  it('탭이 뒤에 있으면 탭 제목에 도착 수를 붙이고, 설정을 켰을 때만 브라우저 알림을 띄운다', async () => {
    const title = 'TEL-ME'
    document.title = title
    setVisibility('hidden')

    await notifyAnswer(1, 'answered')
    expect(NotificationMock).not.toHaveBeenCalled()
    expect(document.title).toBe(`(1) ${title}`)

    useAnswerNotify.setState({ browserEnabled: true })
    await notifyAnswer(2, 'failed')
    expect(NotificationMock).toHaveBeenCalledWith('유심 재발급', { body: '답변을 만들지 못했어요 · TEL-ME', tag: 'telme-chat-2', renotify: true, icon: '/icon-192.png' })
    expect(document.title).toBe(`(2) ${title}`)

    setVisibility('visible')
    document.dispatchEvent(new Event('visibilitychange'))
    expect(document.title).toBe(title)
  })

  it('모바일 브라우저는 페이지 알림을 못 띄우므로 지원하지 않는 것으로 보고 탭 제목만 바꾼다', async () => {
    const ua = vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(
      'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36',
    )
    expect(browserNotifySupported()).toBe(false)
    document.title = 'TEL-ME'
    setVisibility('hidden')
    useAnswerNotify.setState({ browserEnabled: true })
    await notifyAnswer(3, 'answered')
    expect(NotificationMock).not.toHaveBeenCalled()
    expect(document.title).toBe('(1) TEL-ME')
    ua.mockRestore()
  })
})

describe('창은 보이지만 다른 앱을 쓰는 중일 때 (맥에서 다른 앱으로 옮긴 경우)', () => {
  const NotificationMock = vi.fn()
  beforeEach(() => {
    vi.stubGlobal('Notification', Object.assign(NotificationMock, { permission: 'granted' }))
    useAnswerNotify.setState({ browserEnabled: true })
    useAnswerBanners.setState({ items: [] })
    listSessions.mockResolvedValue(sessionsPage({ 1: '요금제 변경 문의' }))
    vi.spyOn(document, 'hasFocus').mockReturnValue(false)
  })
  afterEach(() => {
    NotificationMock.mockReset()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    useAnswerNotify.setState({ browserEnabled: false })
  })

  it('보고 있던 대화의 답변이어도 시스템 알림을 띄운다', async () => {
    window.history.replaceState(null, '', '/chat/1')
    await notifyAnswer(1, 'answered')
    expect(NotificationMock).toHaveBeenCalledWith('요금제 변경 문의', expect.objectContaining({ body: '답변 완료 · TEL-ME' }))
    expect(useAnswerBanners.getState().items).toEqual([])
  })

  it('다른 화면에 있었으면 시스템 알림과 화면 위 알림을 함께 띄운다', async () => {
    window.history.replaceState(null, '', '/stores')
    await notifyAnswer(1, 'answered')
    expect(NotificationMock).toHaveBeenCalledTimes(1)
    expect(useAnswerBanners.getState().items.map((b) => b.sessionId)).toEqual([1])
  })
})

describe('sessionTitleFor', () => {
  beforeEach(() => {
    queryClient.clear()
    listSessions.mockReset()
    getMessages.mockReset()
  })

  it('제목이 아직 없으면 서버가 가려 저장한 마지막 질문을 쓰고, 막힌 질문은 쓰지 않는다', async () => {
    listSessions.mockResolvedValue(sessionsPage({ 3: null }))
    getMessages.mockResolvedValue({
      runningExecutionId: null,
      messages: [
        { role: 'USER', messageType: 'QUESTION', sequenceNo: 1, content: '카드번호 [카드번호] 로 결제했는데 요금제 변경은 어떻게 하나요' },
        { role: 'ASSISTANT', messageType: 'ANSWER', sequenceNo: 2, content: '...' },
        { role: 'USER', messageType: 'BLOCKED', sequenceNo: 3, content: '주민번호 [주민등록번호]' },
      ],
    })
    expect(await sessionTitleFor(3)).toBe('카드번호 [카드번호] 로 결제했는데 요금제…')
  })

  it('제목도 질문도 못 읽으면 "상담"', async () => {
    listSessions.mockRejectedValue(new Error('offline'))
    getMessages.mockRejectedValue(new Error('offline'))
    expect(await sessionTitleFor(9)).toBe('상담')
  })
})
