import { ChevronUp } from 'lucide-react'
import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { chatApi, type ChatCoordinates } from '../api/chat'
import { ApiError } from '../api/client'
import ConfirmDialog from '../components/ConfirmDialog'
import { CharacterStage, type MudoStatus } from '../components/CharacterStage'
import {
  attachSession,
  finishTyping,
  isBusy,
  resumeExecution,
  retryAnswer,
  sendQuestion,
  settle,
  useChatRun,
  type ChatStatus,
} from '../features/chat/chatRunStore'
import ChatHeader from '../features/chat/components/ChatHeader'
import Composer from '../features/chat/components/Composer'
import InputGuardBanner from '../features/chat/components/InputGuardBanner'
import { useRestrictionText } from '../features/chat/useRestrictionText'
import HomeIntro from '../features/chat/components/HomeIntro'
import MessageList from '../features/chat/components/MessageList'
import SessionDrawer from '../features/chat/components/SessionDrawer'
import {
  loadOlderMessages,
  mergeMessages,
  olderCursor,
  useMessages,
  useOlderMessages,
} from '../features/chat/queries'
import { openDislikeSheet, currentFeedback, saveLike, takePendingFeedback } from '../features/feedback/feedbackActions'
import { useMe } from '../features/auth/useAuth'
import { sessionsKey, useSessions } from '../features/chat/sessionQueries'
import { useQueryClient } from '@tanstack/react-query'
import { showToast } from '../stores/toastStore'
import { useChatScroll } from '../features/chat/useChatScroll'
import { CHAT_GPS_ENABLED, hasChoices, isLocationAsk, wantsNearbyStore } from '../features/chat/storeAsk'
import { locateErrorMessage, locateMe } from '../features/stores/locate'
import { rememberMe } from '../features/stores/storeSearchStore'
import { takeHandedQuestion } from '../features/chat/askHandoff'

const MUDO_BY_STATUS: Record<ChatStatus, MudoStatus> = {
  idle: 'idle',
  sending: 'thinking',
  thinking: 'thinking',
  streaming: 'thinking',
  completed: 'completed',
  failed: 'failed',
}

/** 상담 홈(/)과 대화(/chat/:sessionId)를 함께 그리는 화면 */
export default function ChatPage() {
  const navigate = useNavigate()
  const params = useParams()
  const routeId = params.sessionId ? Number(params.sessionId) : null
  const invalidRoute = routeId != null && !(Number.isInteger(routeId) && routeId > 0)

  const run = useChatRun()
  // 메인에서 첫 질문을 보내 세션이 막 생긴 순간에는 아직 주소가 바뀌기 전이라 저장된 세션을 쓴다
  const activeId = routeId ?? (run.pendingQuestion != null || isBusy(run.status) ? run.sessionId : null)
  const own = run.sessionId === activeId
  const status: ChatStatus = own ? run.status : 'idle'
  const busy = isBusy(status)

  useLayoutEffect(() => {
    if (!invalidRoute) attachSession(routeId)
  }, [routeId, invalidRoute])

  const messagesQuery = useMessages(invalidRoute ? null : activeId)
  const history = messagesQuery.data
  // 위로 더 불러온 메시지를 최신 페이지 앞에 붙인다
  const older = useOlderMessages(invalidRoute ? null : activeId).data
  const messages = useMemo(
    () => (older ? mergeMessages(older.messages, history?.messages ?? []) : (history?.messages ?? [])),
    [older, history],
  )
  const olderFrom = olderCursor(history, older)

  // 새로고침 등으로 생성 중인 답변이 있는 대화를 열면 SSE에 다시 붙는다 (문서 2번 결정)
  useEffect(() => {
    if (activeId != null && own && history?.runningExecutionId) {
      resumeExecution(activeId, history.runningExecutionId)
    }
  }, [activeId, own, history?.runningExecutionId])

  const { scrollRef, mascotHidden, toBottom, holdPosition, restorePosition } = useChatScroll()

  // 이전 메시지 더 불러오기 — 붙인 뒤에도 보던 말풍선이 제자리에 있게
  const [loadingOlder, setLoadingOlder] = useState(false)
  const loadOlder = async () => {
    if (activeId == null || loadingOlder) return
    setLoadingOlder(true)
    holdPosition()
    try {
      await loadOlderMessages(activeId)
    } catch (e) {
      restorePosition()
      showToast(e instanceof ApiError ? e.message : '이전 대화를 불러오지 못했어요')
    } finally {
      setLoadingOlder(false)
    }
  }
  useLayoutEffect(() => {
    restorePosition()
  }, [older?.messages.length, restorePosition])
  const { isUser } = useMe()

  // 게스트가 평가하려다 로그인했다면, 돌아와서 그 평가를 이어서 한다 (문서 1번)
  useEffect(() => {
    if (!isUser || activeId == null || !history) return
    const pending = takePendingFeedback(activeId)
    if (!pending) return
    const target = { sessionId: activeId, messageId: pending.messageId }
    if (!messages.some((m) => m.messageId === pending.messageId && m.ratable)) return
    if (pending.rating === 'LIKE') void saveLike(target, currentFeedback(target))
    else openDislikeSheet(target)
  }, [isUser, activeId, history, messages])

  const ask = (question: string, coords?: ChatCoordinates) => {
    toBottom()
    void sendQuestion(question, (id) => navigate(`/chat/${id}`), coords)
  }

  // 입력창에 "현재 위치·근처·주변 + 매장"을 쓰면 위치 권한을 받아 좌표를 함께 보낸다.
  // 위치를 못 받으면 좌표 없이 보낸다 (서버가 지역을 되묻는다)
  const [locating, setLocating] = useState(false)
  const askTyped = async (question: string) => {
    if (!CHAT_GPS_ENABLED || !wantsNearbyStore(question)) return ask(question)
    setLocating(true)
    try {
      const here = await locateMe()
      rememberMe(here)
      ask(question, { latitude: here.lat, longitude: here.lng })
    } catch (error) {
      showToast(locateErrorMessage(error, '위치 권한이 꺼져 있어서 지역을 여쭤볼게요'))
      ask(question)
    } finally {
      setLocating(false)
    }
  }

  // 다른 화면에서 질문을 들고 온 경우 (예: 마이 → 무러바라에게 요금제 물어보기) 한 번만 보낸다
  const location = useLocation()
  const carried = (location.state as { ask?: string } | null)?.ask
  useEffect(() => {
    if (!carried || routeId != null) return
    navigate(location.pathname, { replace: true, state: null })
    void sendQuestion(carried, (id) => navigate(`/chat/${id}`))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carried])

  // 지역 선택 화면에서 고른 지역을 질문으로 넘겨받은 경우 (매장 안내의 "다른 지역으로 찾기") 한 번만 보낸다
  useEffect(() => {
    const handed = takeHandedQuestion(location.pathname)
    if (!handed) return
    toBottom()
    void sendQuestion(handed, (id) => navigate(`/chat/${id}`))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname])

  const retry = (question: string, failedMessageId: number | null) => {
    toBottom()
    void retryAnswer(question, failedMessageId, (id) => navigate(`/chat/${id}`))
  }

  const [drawerOpen, setDrawerOpen] = useState(false)
  const closeDrawer = useCallback(() => setDrawerOpen(false), [])

  const newChat = () => {
    if (busy) return
    setDrawerOpen(false)
    navigate('/')
  }

  const pickSession = (id: number) => {
    setDrawerOpen(false)
    if (id === activeId || busy) return
    navigate(`/chat/${id}`)
  }

  // 종료된 대화는 기록만 볼 수 있다 (대화 목록에 들어 있는 상태로 판단)
  const sessions = useSessions()
  const closed =
    activeId != null &&
    (sessions.data?.pages.flatMap((p) => p.sessions).find((x) => x.sessionId === activeId)?.status === 'CLOSED')

  const notFound =
    invalidRoute || (messagesQuery.error instanceof ApiError && [400, 403, 404].includes(messagesQuery.error.status))
  const showThread = activeId != null && !notFound
  const lastAssistant = messages.filter((m) => m.role === 'ASSISTANT').at(-1)
  // 되묻기 답변일 때 입력창 안내. 선택지가 있으면 고르게 하고, 없으면 질문 문장으로 고른다
  const placeholder =
    lastAssistant?.messageType !== 'CLARIFICATION'
      ? undefined
      : hasChoices(lastAssistant)
        ? '위에서 고르거나 직접 입력해 주세요'
        : isLocationAsk(lastAssistant)
        ? '예: 강남역 근처, 마포구'
        : '무러바라가 물어본 내용을 알려 주세요'

  // 상담 종료: 가장 최근 답변 아래 버튼 → 확인 → 종료 (기록은 남고 더 질문할 수 없다)
  const queryClient = useQueryClient()
  const [confirmEnd, setConfirmEnd] = useState(false)
  const [ending, setEnding] = useState(false)
  const endConsult = async () => {
    if (activeId == null) return
    setEnding(true)
    try {
      await chatApi.closeSession(activeId)
      await queryClient.invalidateQueries({ queryKey: sessionsKey })
      showToast('상담을 종료했어요. 기록은 대화 목록에서 다시 볼 수 있어요')
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : '상담을 종료하지 못했어요')
    } finally {
      setEnding(false)
      setConfirmEnd(false)
    }
  }

  // 반복 욕설로 일시 제한 중이면 입력을 막는다 (TELME-119)
  const restriction = useRestrictionText()

  const listProps = { currentId: activeId, busy, onPick: pickSession, onNewChat: newChat }

  return (
    <div className="flex min-h-0 flex-1">
      <SessionDrawer open={drawerOpen} onClose={closeDrawer} {...listProps} />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <ChatHeader busy={busy} onOpenList={() => setDrawerOpen(true)} onNewChat={newChat} />

        <main ref={scrollRef} className="no-scrollbar min-h-0 flex-1 overflow-y-auto">
          <div className="flex min-h-full flex-col">
            {notFound ? (
              <div className="flex flex-col items-center gap-3 px-6 py-24 text-center">
                <p className="text-[17px] font-extrabold">대화를 찾을 수 없어요</p>
                <p className="text-sm text-ink-sub">삭제됐거나 다른 계정의 대화예요.</p>
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="mt-2 min-h-11 rounded-2xl bg-brand px-5 text-[15px] font-bold text-white"
                >
                  새 대화 시작
                </button>
              </div>
            ) : showThread ? (
              <>
              {olderFrom != null && (
                <div className="flex justify-center px-4 pt-4">
                  <button
                    type="button"
                    onClick={() => void loadOlder()}
                    disabled={loadingOlder}
                    className="flex min-h-9 items-center gap-1 rounded-full bg-surface px-3.5 text-[13px] font-semibold text-ink-sub disabled:opacity-60"
                  >
                    <ChevronUp size={15} strokeWidth={2} aria-hidden />
                    {loadingOlder ? '불러오는 중…' : '이전 대화 더 보기'}
                  </button>
                </div>
              )}
              <MessageList
                sessionId={activeId}
              isUser={isUser}
              messages={messages}
                pendingQuestion={own ? run.pendingQuestion : null}
                status={status}
                typingMessageId={own ? run.typingMessageId : null}
                errorMessage={own ? run.errorMessage : null}
                onTyped={finishTyping}
                onAsk={ask}
                onRetry={retry}
              onEndConsult={closed || ending ? undefined : () => setConfirmEnd(true)}
                closed={closed}
              />
              </>
            ) : (
              <HomeIntro disabled={busy} onAsk={ask} />
            )}
          </div>
        </main>

        <footer className="relative flex shrink-0 flex-col gap-2 bg-bg px-4 py-2.5">
          {showThread && (
            // 위치는 바깥 div가 잡는다 (CharacterStage.css의 position: relative와 겹치지 않게)
            <div
              className={`tm-mascot pointer-events-none absolute bottom-full left-5 z-[3] -mb-3 ${
                mascotHidden ? 'tm-mascot--hide' : ''
              }`}
            >
              <CharacterStage
                status={MUDO_BY_STATUS[status]}
                onCompletedEnd={settle}
                completedHoldMs={2000}
                hideCaption
                style={{ ['--mudo-size' as string]: '90px' }}
              />
            </div>
          )}
          {closed ? (
            <div className="flex items-center gap-3 rounded-[28px] bg-surface py-2.5 pl-4 pr-2.5 text-sm text-ink-sub">
              <span className="min-w-0 flex-1">종료된 대화예요. 기록만 볼 수 있어요.</span>
              <button type="button" onClick={newChat} className="min-h-10 rounded-2xl bg-brand px-4 text-sm font-bold text-white">
                새 대화 시작
              </button>
            </div>
          ) : (
            !notFound && (
              <>
                <InputGuardBanner />
                <Composer
                  busy={busy || locating}
                  placeholder={locating ? '현재 위치를 확인하고 있어요…' : placeholder}
                  lockedText={restriction}
                  onSend={(q) => void askTyped(q)}
                />
              </>
            )
          )}
        </footer>
      </div>
      <ConfirmDialog
        open={confirmEnd}
        title="상담을 종료할까요?"
        confirmLabel="종료"
        onCancel={() => setConfirmEnd(false)}
        onConfirm={() => void endConsult()}
      >
        종료하면 이 대화에는 더 질문할 수 없어요. 기록은 계속 볼 수 있어요.
      </ConfirmDialog>
    </div>
  )
}
