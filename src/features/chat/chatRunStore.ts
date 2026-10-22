import { create } from 'zustand'
import { chatApi, subscribeExecution, type ChatCoordinates } from '../../api/chat'
import { ApiError } from '../../api/client'
import { queryClient } from '../../lib/queryClient'
import { showToast } from '../../stores/toastStore'
import { openLoginSheet } from '../auth/loginSheetStore'
import type { ChatMessageHistory } from '../../api/types'
import { clearAllUnread, notifyAnswer, outcomeOfComplete, shouldNotifyFailure } from './answerNotifier'
import { coordsForNext, forgetCoordsExcept, rememberCoords } from './heldCoords'
import {
  applyGuestRemaining,
  GUEST_DAILY_LIMIT_CODE,
  GUEST_LIMIT_LOGIN_NOTE,
  GUEST_LIMIT_MESSAGE,
  isGuestLocked,
  markGuestLimited,
  refreshGuestLimit,
  useGuestLimit,
} from './guestLimitStore'
import { applyInputGuard, clearInputGuardNotice } from './inputGuardStore'
import { fetchMessages, messagesKey } from './queries'
import { sessionsKey } from './sessionQueries'
import { track } from '../../lib/analytics'

/**
 * 채팅 상태 (문서 3. 채팅 상태)
 *   idle → sending(세션 생성·전송) → thinking(SSE 대기) → streaming(답변 표시) → completed → idle
 *   어느 단계든 실패하면 failed
 */
export type ChatStatus = 'idle' | 'sending' | 'thinking' | 'streaming' | 'completed' | 'failed'

export const isBusy = (status: ChatStatus) => status === 'sending' || status === 'thinking' || status === 'streaming'

interface ChatRunState {
  /** 지금 화면이 보고 있는 대화. 메인(새 대화)이면 null */
  sessionId: number | null
  status: ChatStatus
  /**
   * 서버에 저장되기 전의 내 질문 (원문). 화면에는 그리지 않고 대기 말풍선만 보여 준다.
   * 서버가 민감정보를 가린 뒤 저장한 내용이 메시지 목록으로 오면 그것을 보여 준다 (TELME-119)
   */
  pendingQuestion: string | null
  /** 방금 보낸 질문이 서버에 저장된 메시지 번호. 목록에 이 번호가 보이면 대기 말풍선을 내린다 */
  sentMessageId: number | null
  /** 타자 효과로 보여 줄 답변 메시지 */
  typingMessageId: number | null
  errorMessage: string | null
  /** 방금 질문이 게스트 하루 질문 수에 걸려 거절됐다 (CHAT429-0). 다시 시도 대신 로그인을 안내한다 */
  guestLimited: boolean
  /** 모델 호출이 실패해 서버가 자동으로 다시 시도하는 중 (SSE status: RETRYING). 답변이 끝나면 내린다 */
  retrying: boolean
}

const initial: ChatRunState = {
  sessionId: null,
  status: 'idle',
  pendingQuestion: null,
  sentMessageId: null,
  typingMessageId: null,
  errorMessage: null,
  guestLimited: false,
  retrying: false,
}

/**
 * 화면이 바뀌어도(/ → /chat/:id) 진행 중인 답변을 잃지 않도록 상태와 SSE 구독을 컴포넌트 밖에 둔다.
 */
export const useChatRun = create<ChatRunState>(() => initial)

const get = useChatRun.getState
const set = useChatRun.setState

let stopStream: (() => void) | null = null
/**
 * 답변을 기다리는 중에 다른 대화로 옮긴 구독 (sessionId → 끊기).
 * 서버는 구독과 상관없이 답변을 끝까지 만들므로, 끝나면 목록만 새로 읽고 알린다
 */
const background = new Map<number, () => void>()

/** 백그라운드에서 답변을 만드는 중인 대화. 하단 메뉴 "상담"에 생성 중 표시를 한다 */
export const useBackgroundRuns = create<{ ids: number[] }>(() => ({ ids: [] }))
const syncBackground = () => useBackgroundRuns.setState({ ids: [...background.keys()] })
/**
 * 현재 위치와 함께 보낸 마지막 질문과 그 실행. "다시 시도"할 때만 위치를 다시 붙인다
 * (서버가 좌표를 저장하지 않음). 질문이 저장되기 전이면 executionId가 없다
 */
let lastLocated: { content: string; coords: ChatCoordinates; executionId: number | null } | null = null
/** 질문을 보내는 중(서버 응답 전)인 대화 */
let sendingSessionId: number | null = null
let reconnectTries = 0
const MAX_RECONNECT = 3

function closeStream() {
  stopStream?.()
  stopStream = null
}

const NETWORK_MESSAGE = '연결이 불안정해요. 잠시 후 다시 시도해 주세요.'

const isGuestLimitError = (error: unknown) => error instanceof ApiError && error.code === GUEST_DAILY_LIMIT_CODE

/**
 * 게스트 하루 질문 수에 걸려 거절됐을 때 (CHAT429-0).
 * 같은 날 다시 보내도 또 거절되므로 입력창을 로그인 안내로 바꾸고, 이번 한 번은 로그인 시트를 바로 띄운다.
 * 잠금 해제 시각은 서버 값(resetsAt)으로 다시 맞춘다
 */
function rejectByGuestLimit() {
  markGuestLimited()
  void refreshGuestLimit()
  set({ status: 'failed', errorMessage: GUEST_LIMIT_MESSAGE, guestLimited: true })
  openLoginSheet({ subtitle: GUEST_LIMIT_LOGIN_NOTE })
}

/** 답이 실패하면 그 질문은 세지 않으므로(한도가 1회 돌아온다) 게스트면 남은 수를 다시 받는다 */
function refreshGuestLimitAfterFailure() {
  if (useGuestLimit.getState().remaining != null) void refreshGuestLimit()
}

/** 메시지와 대화 목록(제목·마지막 시간)을 함께 새로 읽는다 */
const refreshMessages = (sessionId: number) => {
  void queryClient.invalidateQueries({ queryKey: sessionsKey })
  return queryClient.invalidateQueries({ queryKey: messagesKey(sessionId) })
}

/**
 * 라우트의 대화가 바뀌면 부른다. 같은 대화면 아무것도 하지 않는다.
 * 답변을 기다리던 대화를 떠나면 구독을 끊지 않고 백그라운드로 넘기고, 그 대화로 돌아오면 다시 이어 받는다
 */
export function attachSession(sessionId: number | null) {
  const prev = get()
  if (prev.sessionId === sessionId) return
  const toBackground = stopStream != null && prev.sessionId != null && prev.status === 'thinking'
  if (toBackground) {
    background.set(prev.sessionId!, stopStream!)
    stopStream = null
    syncBackground()
  } else {
    closeStream()
  }
  lastLocated = null
  // 답변을 아직 기다리는 대화(백그라운드로 넘겼거나 보내는 중)의 좌표는 남긴다.
  // 그 답변이 되묻기면 돌아와서 답할 때 다시 붙여야 한다
  forgetCoordsExcept([...background.keys(), sendingSessionId])
  const resumed = sessionId != null ? background.get(sessionId) : undefined
  if (resumed) {
    background.delete(sessionId!)
    syncBackground()
    stopStream = resumed
    set({ ...initial, sessionId, status: 'thinking' })
    return
  }
  set({ ...initial, sessionId })
}

/** 로그아웃 등으로 이전 사용자의 대화를 더 따라가지 않을 때 (도착 표시도 지운다) */
export function stopBackgroundStreams() {
  background.forEach((stop) => stop())
  background.clear()
  syncBackground()
  clearAllUnread()
}

/** 백그라운드로 넘어간 구독이 끝났으면 true (목록을 새로 읽고 알린 뒤) */
function finishInBackground(sessionId: number, notify: () => void): boolean {
  if (!background.has(sessionId)) return false
  background.delete(sessionId)
  syncBackground()
  void refreshMessages(sessionId)
  notify()
  return true
}

/** 답변 생성 SSE를 구독한다. 새로고침 후 runningExecutionId로 다시 붙을 때도 쓴다 */
function listen(sessionId: number, executionId: number) {
  closeStream()
  set({ status: 'thinking', errorMessage: null, retrying: false })
  stopStream = subscribe(sessionId, executionId)
}

/**
 * 질문을 보낸 뒤 서버 응답이 오기 전에 다른 대화로 옮겼을 때.
 * 답변은 서버에서 계속 만들어지므로 처음부터 백그라운드로 구독해 두었다가 끝나면 알린다
 */
function listenInBackground(sessionId: number, executionId: number) {
  background.get(sessionId)?.()
  background.set(sessionId, subscribe(sessionId, executionId))
  syncBackground()
}

/** 구독 하나. 끝났을 때 백그라운드로 넘어가 있으면 알리기만 하고, 보고 있는 대화면 화면 상태를 바꾼다 */
function subscribe(sessionId: number, executionId: number) {
  return subscribeExecution(sessionId, executionId, {
    onComplete: async (state) => {
      reconnectTries = 0
      const notify = () => void notifyAnswer(sessionId, outcomeOfComplete(state), state.outputMessage?.messageId ?? null)
      if (finishInBackground(sessionId, notify)) return
      stopStream = null
      if (get().sessionId !== sessionId) return
      notify()
      await refreshMessages(sessionId)
      const messageId = state.outputMessage?.messageId ?? null
      set({ pendingQuestion: null, typingMessageId: messageId, status: messageId ? 'streaming' : 'completed', retrying: false })
    },
    onError: async (failure) => {
      reconnectTries = 0
      refreshGuestLimitAfterFailure()
      const notify = () => {
        if (shouldNotifyFailure(failure)) void notifyAnswer(sessionId, 'failed')
      }
      if (finishInBackground(sessionId, notify)) return
      stopStream = null
      if (get().sessionId !== sessionId) return
      notify()
      await refreshMessages(sessionId)
      set({ pendingQuestion: null, status: 'failed', errorMessage: failure.message, retrying: false })
    },
    onStatus: (status) => {
      // 백그라운드 구독이거나 다른 대화를 보고 있으면 화면에 띄울 곳이 없다
      if (status !== 'RETRYING' || background.has(sessionId) || get().sessionId !== sessionId) return
      set({ retrying: true })
    },
    onDisconnect: async () => {
      // 백그라운드에서 끊기면 결과를 알 수 없으니 알리지 않는다. 그 대화를 다시 열면 runningExecutionId로 이어 받는다
      if (finishInBackground(sessionId, () => {})) return
      stopStream = null
      if (get().sessionId !== sessionId) return
      set({ retrying: false })
      // 연결만 끊긴 경우: 다시 읽어서 아직 만드는 중이면 다시 붙는다
      try {
        const history = await queryClient.fetchQuery({
          queryKey: messagesKey(sessionId),
          queryFn: () => fetchMessages(sessionId),
          staleTime: 0,
        })
        if (get().sessionId !== sessionId) return
        if (history.runningExecutionId && reconnectTries < MAX_RECONNECT) {
          reconnectTries += 1
          window.setTimeout(() => {
            if (get().sessionId === sessionId) listen(sessionId, history.runningExecutionId!)
          }, 1000 * reconnectTries)
          return
        }
        reconnectTries = 0
        set({ pendingQuestion: null, status: history.runningExecutionId ? 'failed' : 'idle', errorMessage: history.runningExecutionId ? NETWORK_MESSAGE : null })
      } catch {
        set({ status: 'failed', errorMessage: NETWORK_MESSAGE })
      }
    },
  })
}

/** 새로고침 등으로 생성 중인 답변이 있는 대화를 열었을 때 */
export function resumeExecution(sessionId: number, executionId: number) {
  const state = get()
  if (state.sessionId !== sessionId || isBusy(state.status) || stopStream) return
  listen(sessionId, executionId)
}

/**
 * 질문 보내기. 메인(새 대화)에서는 이때 세션을 만들고 onSessionCreated로 주소를 바꾼다 (문서 2. 채팅 세션 생성)
 * coords는 "현재 위치 사용"을 눌러 보낼 때만 준다.
 * 위치를 보낸 뒤 되묻기에 답할 때는 그 좌표를 다시 붙인다 (서버가 좌표를 저장하지 않음, heldCoords)
 */
export async function sendQuestion(
  question: string,
  onSessionCreated?: (sessionId: number) => void,
  coords?: ChatCoordinates,
) {
  const content = question.trim()
  if (!content || isBusy(get().status)) return
  // 오늘 질문을 모두 쓴 게스트: 보내 봐야 거절되므로 대화를 만들지 않고 로그인만 안내한다
  // (입력창·칩은 화면에서 막혀 있고, 다른 화면에서 넘겨받은 질문 등이 여기로 온다)
  if (isGuestLocked()) {
    openLoginSheet({ subtitle: GUEST_LIMIT_LOGIN_NOTE })
    return
  }

  clearInputGuardNotice()
  set({
    status: 'sending',
    pendingQuestion: content,
    sentMessageId: null,
    typingMessageId: null,
    errorMessage: null,
    guestLimited: false,
  })
  let sessionId = get().sessionId
  // 새 대화면 질문이 접수된 뒤에 주소를 바꾼다. 첫 질문이 한도에 걸리면 빈 대화로 옮기지 않는다
  let created: number | null = null
  const moveToCreated = () => {
    if (created != null && get().sessionId === created) onSessionCreated?.(created)
    created = null
  }
  try {
    if (sessionId == null) {
      const session = await chatApi.createSession()
      sessionId = session.sessionId
      created = sessionId
      track('consult_start')
      set({ sessionId })
    }
    sendingSessionId = sessionId
    let sendCoords = coords
    if (coords) rememberCoords(sessionId, coords)
    else sendCoords = coordsForNext(sessionId, queryClient.getQueryData<ChatMessageHistory>(messagesKey(sessionId))?.messages)
    lastLocated = sendCoords ? { content, coords: sendCoords, executionId: null } : null
    const sent = await chatApi.sendMessage(sessionId, content, sendCoords).finally(() => {
      sendingSessionId = null
    })
    track('question_send')
    if (lastLocated?.content === content) lastLocated.executionId = sent.executionId ?? null
    applyGuestRemaining(sent.guestQuestionsRemaining)
    moveToCreated()
    if (get().sessionId !== sessionId) {
      // 보내는 사이 다른 대화로 옮겼다. 사용 제한은 대화와 상관없이 걸리므로 반영하고, 답변은 백그라운드에서 기다린다
      if (sent.inputGuard?.action === 'RESTRICTED') applyInputGuard(sent.inputGuard)
      void refreshMessages(sessionId)
      if (sent.executionId != null) listenInBackground(sessionId, sent.executionId)
      return
    }
    set({ sentMessageId: sent.messageId ?? null })
    // 입력 검사 (TELME-119): 가림(MASKED)은 그대로 진행, 경고·재입력·제한은 답변을 만들지 않는다
    if (sent.inputGuard) {
      applyInputGuard(sent.inputGuard)
      if (sent.inputGuard.action === 'MASKED') showToast(sent.inputGuard.message)
    }
    await refreshMessages(sessionId)
    set({ pendingQuestion: null, sentMessageId: null })
    if (sent.executionId == null) {
      set({ status: 'idle' })
      return
    }
    listen(sessionId, sent.executionId)
  } catch (error) {
    if (created != null && get().sessionId === created && isGuestLimitError(error)) {
      // 새 대화의 첫 질문이 한도에 걸렸다: 빈 대화로 옮기지 않고 홈에 남는다
      created = null
      set({ ...initial })
      rejectByGuestLimit()
      return
    }
    moveToCreated()
    if (get().sessionId !== sessionId) return
    // 이전 답변을 아직 만드는 중이면 그 답변에 다시 붙는다
    if (error instanceof ApiError && error.code === 'CHAT409-3' && sessionId != null) {
      const history = await fetchMessages(sessionId).catch(() => null)
      if (history?.runningExecutionId) {
        set({ pendingQuestion: null })
        listen(sessionId, history.runningExecutionId)
        return
      }
    }
    if (isGuestLimitError(error)) return rejectByGuestLimit()
    set({ status: 'failed', errorMessage: error instanceof ApiError ? error.message : NETWORK_MESSAGE })
  }
}

/** 타자 효과가 끝났을 때 */
export function finishTyping() {
  if (get().status === 'streaming') set({ status: 'completed', typingMessageId: null })
}

/** 완료 모션이 끝났을 때 (CharacterStage onCompletedEnd) */
export function settle() {
  if (get().status === 'completed') set({ status: 'idle' })
}

/**
 * 실패한 답변 다시 시도 (문서 4. 생성 실패와 재시도, TELME-219)
 * - 일시적인 생성 실패(retryableExecutionId 있음): 재시도 API로 같은 질문에 새 실행만 붙인다.
 *   질문 말풍선은 새로 생기지 않고, 새 답변이 오면 실패 말풍선은 목록에서 접힌다 (foldRetried).
 *   게스트 하루 질문 수에 세지 않으므로 한도에 걸린 게스트도 막지 않는다
 * - 질문이 서버에 저장되기 전에 실패했다면(retryableExecutionId 없음) 처음부터 다시 보낸다
 */
export async function retryAnswer(
  question: string,
  retryableExecutionId: number | null,
  onSessionCreated?: (sessionId: number) => void,
) {
  if (isBusy(get().status)) return
  const sessionId = get().sessionId
  const content = question.trim()
  if (sessionId == null || retryableExecutionId == null) {
    const coords = lastLocated?.content === content ? lastLocated.coords : undefined
    return sendQuestion(question, onSessionCreated, coords)
  }
  const located =
    lastLocated && (lastLocated.executionId === retryableExecutionId || lastLocated.content === content)
      ? lastLocated
      : null
  set({ status: 'sending', typingMessageId: null, errorMessage: null, retrying: false })
  try {
    const sent = await chatApi.retryExecution(sessionId, retryableExecutionId, located?.coords)
    applyGuestRemaining(sent.guestQuestionsRemaining)
    if (located) located.executionId = sent.executionId ?? null
    if (get().sessionId !== sessionId) {
      void refreshMessages(sessionId)
      if (sent.executionId != null) listenInBackground(sessionId, sent.executionId)
      return
    }
    await refreshMessages(sessionId)
    if (sent.executionId == null) return set({ status: 'idle' })
    listen(sessionId, sent.executionId)
  } catch (error) {
    if (get().sessionId !== sessionId) return
    if (error instanceof ApiError) {
      // 다른 답변을 만드는 중이면 그 답변에 붙는다
      if (error.code === 'CHAT409-3') {
        const history = await fetchMessages(sessionId).catch(() => null)
        if (history?.runningExecutionId) return listen(sessionId, history.runningExecutionId)
      }
      // 이미 다시 시도했거나(CHAT409-6) 다시 시도할 수 없는 답변(CHAT409-5): 목록을 새로 읽으면 버튼이 사라진다
      if (error.code === 'CHAT409-5' || error.code === 'CHAT409-6') {
        showToast(error.message)
        await refreshMessages(sessionId)
        return set({ status: 'idle' })
      }
    }
    set({ status: 'failed', errorMessage: error instanceof ApiError ? error.message : NETWORK_MESSAGE })
  }
}
