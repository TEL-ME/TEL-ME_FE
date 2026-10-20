import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { chatApi } from '../../api/chat'
import type { ChatExecutionState, ChatFailure, ChatMessageHistory, ChatSessionList } from '../../api/types'
import { queryClient } from '../../lib/queryClient'
import { showToast } from '../../stores/toastStore'
import { saveNotification } from '../notifications/queries'
import { messagesKey } from './queries'
import { sessionsKey } from './sessionQueries'

/**
 * 답변 완료 알림. 기다리는 대화가 여럿일 수 있어 어느 대화의 답변인지(대화 제목)를 함께 보여 준다
 * - 그 대화를 보고 있으면: 알리지 않는다 (답변이 바로 보인다)
 * - 앱 안의 다른 화면(매장·설정·다른 대화)이면: 화면 위에서 내려오는 알림 (대화 제목 + 결과)
 * - 탭이 뒤에 있거나 다른 앱을 쓰는 중이면: 시스템 알림(설정에서 켰을 때) + 탭 제목에 도착 수 표시
 */
export type AnswerOutcome = 'answered' | 'clarify' | 'failed'

export const OUTCOME_TEXT: Record<AnswerOutcome, string> = {
  answered: '답변 완료',
  clarify: '추가 정보가 필요해요',
  failed: '답변을 만들지 못했어요',
}

interface AnswerNotifyState {
  /** 탭이 뒤에 있을 때 브라우저 알림을 띄울지 (권한은 켤 때 받는다) */
  browserEnabled: boolean
}

export const useAnswerNotify = create<AnswerNotifyState>()(
  persist<AnswerNotifyState>(() => ({ browserEnabled: false }), { name: 'telme-answer-notify' }),
)

/**
 * 페이지에서 바로 알림(new Notification)을 띄울 수 있는 브라우저인지.
 * 안드로이드 Chrome은 Notification이 있어도 생성자가 막혀 있고(서비스 워커로만 가능), iOS는 홈 화면 앱에서만 있어 모바일은 뺀다
 */
const isMobile = () => {
  const data = (navigator as Navigator & { userAgentData?: { mobile?: boolean } }).userAgentData
  return data?.mobile ?? /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
}

export const browserNotifySupported = () => typeof window !== 'undefined' && 'Notification' in window && !isMobile()

/** 설정 토글. 켤 때는 권한을 받고, 받지 못하면 꺼 둔 채로 이유를 알린다 */
export async function setBrowserNotify(on: boolean) {
  if (!on) return useAnswerNotify.setState({ browserEnabled: false })
  if (!browserNotifySupported()) return showToast('이 브라우저는 알림을 지원하지 않아요')
  const permission =
    Notification.permission === 'default' ? await Notification.requestPermission() : Notification.permission
  if (permission !== 'granted') return showToast('브라우저 설정에서 이 사이트의 알림을 허용해 주세요', 3200)
  useAnswerNotify.setState({ browserEnabled: true })
}

/** 켜져 있고 권한도 있을 때만 켜진 것으로 본다 (권한은 브라우저 설정에서 언제든 바뀐다) */
export const browserNotifyOn = (enabled: boolean) =>
  enabled && browserNotifySupported() && Notification.permission === 'granted'

export function outcomeOfComplete(state: ChatExecutionState): AnswerOutcome {
  if (state.status !== 'COMPLETED') return 'failed'
  return state.outputMessage?.messageType === 'CLARIFICATION' ? 'clarify' : 'answered'
}

/** 같은 실행을 다른 창에서 보고 있다는 안내는 답변 결과가 아니므로 알리지 않는다 */
export const shouldNotifyFailure = (failure: ChatFailure) => failure.errorCode !== 'CONNECTED_ELSEWHERE'

const chatPath = (sessionId: number) => `/chat/${sessionId}`

/** 시스템 알림에 붙이는 대표 로고 (public/icon-192.png) */
const NOTIFICATION_ICON = '/icon-192.png'

/** 답변이 왔지만 아직 열어 보지 않은 대화. 하단 메뉴 "상담"에 점으로 표시한다 */
export const useUnreadAnswers = create<{ ids: number[] }>(() => ({ ids: [] }))

function markUnread(sessionId: number) {
  const { ids } = useUnreadAnswers.getState()
  if (!ids.includes(sessionId)) useUnreadAnswers.setState({ ids: [...ids, sessionId] })
}

/** 그 대화를 열면 부른다 */
export function clearUnread(sessionId: number) {
  const { ids } = useUnreadAnswers.getState()
  if (ids.includes(sessionId)) useUnreadAnswers.setState({ ids: ids.filter((id) => id !== sessionId) })
}

export function clearAllUnread() {
  useUnreadAnswers.setState({ ids: [] })
  useAnswerBanners.setState({ items: [] })
}

/** 라우터가 이 모듈을 거쳐 chatRunStore를 불러오므로, 순환 참조를 피해 쓸 때 불러온다 */
const openChat = (sessionId: number) =>
  void import('../../app/router').then(({ router }) => router.navigate(chatPath(sessionId)))

/**
 * 사용자가 이 화면을 보고 있지 않은지: 탭이 뒤에 있거나, 창은 떠 있지만 다른 앱·창을 쓰는 중.
 * 맥에서 다른 앱으로 옮기면 브라우저 창이 화면에 남아 있어 visibilityState는 visible 그대로라 포커스도 함께 본다
 */
const isAway = () => document.visibilityState === 'hidden' || !document.hasFocus()

let unread = 0
let baseTitle: string | null = null

function markTitle() {
  if (baseTitle == null) {
    baseTitle = document.title
    // 탭으로 돌아오거나 창을 다시 쓰기 시작하면 원래 제목으로 되돌린다
    const restore = () => {
      if (isAway() || baseTitle == null) return
      unread = 0
      document.title = baseTitle
    }
    document.addEventListener('visibilitychange', restore)
    window.addEventListener('focus', restore)
  }
  unread += 1
  document.title = `(${unread}) ${baseTitle}`
}

// ---- 어느 대화인지: 대화 제목 ----

const TITLE_MAX = 24
const clip = (text: string) => {
  const t = text.replace(/\s+/g, ' ').trim()
  return t.length > TITLE_MAX ? `${t.slice(0, TITLE_MAX).trimEnd()}…` : t
}

const titleIn = (lists: readonly ChatSessionList[] | undefined, sessionId: number) =>
  lists?.flatMap((l) => l.sessions).find((s) => s.sessionId === sessionId)?.title?.trim() || null

/**
 * 제목 대신 쓸 마지막 질문. 서버가 민감정보를 가려 저장한 내용만 쓴다 (입력한 원문은 알림에 내보내지 않는다)
 */
const lastQuestionIn = (history: ChatMessageHistory | undefined) =>
  history?.messages
    .filter((m) => m.role === 'USER' && m.messageType !== 'BLOCKED' && m.content)
    .sort((a, b) => b.sequenceNo - a.sequenceNo)[0]?.content ?? null

const withTimeout = <T,>(promise: Promise<T>) =>
  Promise.race([promise, new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 1500))])

/**
 * 알림에 쓸 대화 제목. 서버는 제목을 답변과 따로 만들어서 아직 없을 수 있다.
 * 목록에 있는 제목 → 대화 목록을 새로 읽은 제목 → 마지막 질문 → "상담" 순으로 쓴다
 */
export async function sessionTitleFor(sessionId: number): Promise<string> {
  const cached = queryClient.getQueryData<{ pages: ChatSessionList[] }>(sessionsKey)?.pages
  const known = titleIn(cached, sessionId)
  if (known) return clip(known)
  try {
    // 방금 답이 온 대화는 최근 순 목록의 첫 페이지에 있다
    const title = titleIn([await withTimeout(chatApi.listSessions(undefined, 20))], sessionId)
    if (title) return clip(title)
  } catch {
    // 제목을 못 읽어도 알림은 띄운다
  }
  let asked = lastQuestionIn(queryClient.getQueryData<ChatMessageHistory>(messagesKey(sessionId)))
  if (!asked) asked = await withTimeout(chatApi.getMessages(sessionId, undefined, 10)).then(lastQuestionIn, () => null)
  return asked ? clip(asked) : '상담'
}

// ---- 화면 위 알림 ----

export interface AnswerBanner {
  id: number
  sessionId: number
  title: string
  outcome: AnswerOutcome
}

/** 한 번에 보여 주는 알림 수. 넘치면 오래된 것부터 내린다 */
const MAX_BANNERS = 3
let bannerSeq = 0

export const useAnswerBanners = create<{ items: AnswerBanner[] }>(() => ({ items: [] }))

function pushBanner(sessionId: number, title: string, outcome: AnswerOutcome) {
  const rest = useAnswerBanners.getState().items.filter((b) => b.sessionId !== sessionId)
  bannerSeq += 1
  useAnswerBanners.setState({ items: [{ id: bannerSeq, sessionId, title, outcome }, ...rest].slice(0, MAX_BANNERS) })
}

export function dismissBanner(id: number) {
  useAnswerBanners.setState({ items: useAnswerBanners.getState().items.filter((b) => b.id !== id) })
}

/** 알림을 눌렀을 때: 그 대화로 가고 그 대화의 알림을 내린다 */
export function openBanner(banner: AnswerBanner) {
  useAnswerBanners.setState({ items: useAnswerBanners.getState().items.filter((b) => b.sessionId !== banner.sessionId) })
  openChat(banner.sessionId)
}

/** 그 대화를 열면 그 대화의 알림은 필요 없다 */
export function dismissBannersOf(sessionId: number) {
  const { items } = useAnswerBanners.getState()
  if (items.some((b) => b.sessionId === sessionId)) {
    useAnswerBanners.setState({ items: items.filter((b) => b.sessionId !== sessionId) })
  }
}

// ---- 알림 목록에 남기기 (서버 저장) ----

/** 실패 알림은 실패한 답변 메시지에 단다. 종료 이벤트에는 메시지 번호가 없어 최근 메시지에서 찾는다 */
async function failedMessageId(sessionId: number): Promise<number | null> {
  try {
    const history = await withTimeout(chatApi.getMessages(sessionId, undefined, 5))
    const failed = history.messages
      .filter((m) => m.role === 'ASSISTANT' && (m.status === 'FAILED' || m.status === 'TIMEOUT'))
      .sort((a, b) => b.sequenceNo - a.sequenceNo)[0]
    return failed?.messageId ?? null
  } catch {
    return null
  }
}

/** 보고 있지 않은 대화의 답변은 알림 목록(마이 › 알림)에 남긴다 */
async function recordNotification(sessionId: number, outcome: AnswerOutcome, messageId: number | null) {
  const id = outcome === 'failed' ? await failedMessageId(sessionId) : messageId
  if (id == null) return
  await saveNotification(outcome === 'failed' ? 'ANSWER_FAILED' : 'ANSWER_ARRIVED', sessionId, id)
}

export async function notifyAnswer(sessionId: number, outcome: AnswerOutcome, messageId: number | null = null) {
  const viewing = () => window.location.pathname === chatPath(sessionId)
  // 그 대화를 보고 있으면 탭이 뒤에 있어도 돌아왔을 때 바로 보이므로 표시하지 않는다
  if (!viewing()) {
    markUnread(sessionId)
    void recordNotification(sessionId, outcome, messageId)
  }
  const away = isAway()
  if (away) markTitle()
  else if (viewing()) return

  const title = await sessionTitleFor(sessionId)

  if (away && browserNotifyOn(useAnswerNotify.getState().browserEnabled)) {
    try {
      // 같은 대화의 알림은 하나만 남기되, 바꿔 넣을 때도 다시 띄운다 (renotify가 없으면 크롬이 조용히 교체한다)
      const n = new Notification(title, {
        body: `${OUTCOME_TEXT[outcome]} · TEL-ME`,
        tag: `telme-chat-${sessionId}`,
        renotify: true,
        // 대표 로고. 맥 크롬은 알림 오른쪽에 작게 보여 준다
        icon: NOTIFICATION_ICON,
      } as NotificationOptions)
      n.onclick = () => {
        window.focus()
        openChat(sessionId)
        n.close()
      }
    } catch {
      // 모바일 크롬처럼 페이지에서 바로 띄우는 알림을 막는 브라우저는 탭 제목 표시만 남긴다
    }
  }

  // 화면 위 알림은 탭이 보일 때만. 제목을 읽는 사이 그 대화를 열었으면 띄우지 않는다
  if (document.visibilityState === 'hidden' || viewing()) return
  pushBanner(sessionId, title, outcome)
}
