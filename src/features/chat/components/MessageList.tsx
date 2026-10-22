import { RotateCw } from 'lucide-react'
import { useEffect } from 'react'
import type { ChatCoordinates } from '../../../api/chat'
import type { ChatMessage } from '../../../api/types'
import FeedbackButtons from '../../feedback/FeedbackButtons'
import ListenButton from '../../speech/ListenButton'
import { stopSpeech } from '../../speech/speechPlayer'
import { isBusy, type ChatStatus } from '../chatRunStore'
import AnswerText from './AnswerText'
import { BotBubble, PendingUserBubble, UserBubble, type BotTone } from './Bubbles'
import FollowUps from './FollowUps'
import LocationAskChips from './LocationAskChips'
import SourceList from './SourceList'
import StoreResults from './StoreResults'
import { foldRetried, isFailed } from '../foldRetried'
import { isLocationAsk } from '../storeAsk'
import ThinkingDots from './ThinkingDots'

interface MessageListProps {
  sessionId: number | null
  isUser: boolean
  messages: ChatMessage[]
  /** 서버에 저장되기 전의 내 질문 (원문). 그리지 않고 대기 말풍선으로 대신한다 */
  pendingQuestion: string | null
  /** 그 질문이 저장된 메시지 번호 (전송 응답에서 받는다) */
  sentMessageId?: number | null
  status: ChatStatus
  typingMessageId: number | null
  errorMessage: string | null
  /** 게스트 하루 질문 수에 걸려 거절됐다. 같은 날엔 다시 시도해도 또 거절되므로 다시 시도를 빼고 안내만 한다 (로그인 버튼은 입력창 자리에 있다) */
  guestLimited?: boolean
  /** 오늘 질문을 모두 쓴 게스트: 질문을 보내는 칩(후속 질문·위치·다른 지역 찾기)을 막는다 */
  askLocked?: boolean
  onTyped: () => void
  /** coords는 "현재 위치 사용"으로 보낼 때만 있다 */
  onAsk: (question: string, coords?: ChatCoordinates) => void
  /** 종료된 대화: 빠른 답 버튼을 보여 주지 않는다 */
  closed?: boolean
  /**
   * 다시 시도할 수 있는 실패 답변의 실행 ID (메시지 목록의 retryableExecutionId).
   * 있을 때만 마지막 실패 답변에 "다시 시도"를 그린다. 이미 다시 시도했거나 일시적인 실패가 아니면 null
   */
  retryableExecutionId?: number | null
  /** 서버가 답변 생성을 자동으로 다시 시도하는 중 (SSE status: RETRYING) */
  retrying?: boolean
  /** retryableExecutionId가 null이면 질문이 서버에 저장되기 전에 실패한 경우 (같은 질문을 다시 보낸다) */
  onRetry: (question: string, retryableExecutionId: number | null) => void
}

const FAIL_STATUSES = new Set(['FAILED', 'TIMEOUT', 'CANCELLED'])
const FALLBACK_ERROR = '답변을 만들지 못했어요. 잠시 후 다시 시도해 주세요.'
const RETRYING_NOTICE = '답변 생성이 지연돼 다시 시도하고 있어요'

/** 평가 가능한 답변: 백엔드가 ratable로 알려 준다 (완료된 상담 답변·매장 추천) */
const canRate = (m: ChatMessage) => m.ratable && m.status === 'COMPLETED'
/** 답변 듣기: 완료된 챗봇 메시지 전부 (답변·되묻기·매장 결과). 읽을 글이 없으면 숨긴다 */
const canListen = (m: ChatMessage) => m.role === 'ASSISTANT' && m.status === 'COMPLETED' && !!m.content?.trim()

function dayLabel(iso: string | undefined): string {
  const d = iso ? new Date(iso) : new Date()
  if (d.toDateString() === new Date().toDateString()) return '오늘'
  return `${d.getMonth() + 1}월 ${d.getDate()}일`
}

function toneOf(m: ChatMessage): { tone: BotTone; meta?: string } {
  if (m.messageType === 'CLARIFICATION') return { tone: 'ask', meta: '조건 확인' }
  if (m.answerBasis === 'NO_EVIDENCE') return { tone: 'notice', meta: '확인된 정보 없음' }
  if (m.answerBasis === 'OUT_OF_SCOPE') return { tone: 'notice', meta: '상담 범위 밖의 질문' }
  return { tone: 'default' }
}

export default function MessageList({
  sessionId,
  isUser,
  messages,
  pendingQuestion,
  sentMessageId = null,
  status,
  typingMessageId,
  errorMessage,
  guestLimited = false,
  askLocked = false,
  onTyped,
  onAsk,
  onRetry,
  closed = false,
  retryableExecutionId = null,
  retrying = false,
}: MessageListProps) {
  const busy = isBusy(status)
  // 대화를 바꾸거나 화면을 떠나면 듣던 답변을 멈춘다
  useEffect(() => () => stopSpeech(), [sessionId])
  const folded = foldRetried(
    [...messages].sort((a, b) => a.sequenceNo - b.sequenceNo),
    pendingQuestion,
  )
  const foldedLast = folded[folded.length - 1]
  // 저장된 질문이 목록에 오면 대기 말풍선을 내린다. 서버가 내용을 가렸을 수 있어 글자가 아니라 번호로 찾는다
  const sentArrived = sentMessageId != null && folded.some((m) => m.messageId === sentMessageId)
  const showPending =
    pendingQuestion != null &&
    !sentArrived &&
    !(foldedLast?.role === 'USER' && foldedLast.content === pendingQuestion)
  // "다시 시도"를 누른 뒤 새 답변이 목록에 오기 전: 실패 말풍선 자리에 대기 말풍선 하나만 보인다
  const retryingFailed =
    (status === 'sending' || status === 'thinking') && !showPending && foldedLast != null && isFailed(foldedLast)
  const sorted = retryingFailed ? folded.slice(0, -1) : folded
  const last = sorted[sorted.length - 1]
  const lastIsGenerating = last?.role === 'ASSISTANT' && last.status === 'GENERATING'
  const showThinking = (status === 'sending' || status === 'thinking') && !lastIsGenerating
  // 질문이 서버에 저장되기 전에 실패한 경우 (세션 생성·전송 실패)
  const showSendError = status === 'failed' && showPending
  // 후속 질문은 맨 마지막 답변에만, 타자 효과가 끝난 뒤에 보인다
  const lastAnswerId =
    !showPending && last?.role === 'ASSISTANT' && last.status === 'COMPLETED' ? last.messageId : null

  const retryButton = (question: string, executionId: number | null) => (
    <button
      type="button"
      disabled={busy}
      onClick={() => onRetry(question, executionId)}
      className="mt-2.5 flex min-h-9 items-center gap-1.5 rounded-full bg-surface-2 px-3.5 text-sm font-semibold text-ink disabled:opacity-50"
    >
      <RotateCw size={15} strokeWidth={2} aria-hidden />
      다시 시도
    </button>
  )

  const thinkingBubble = (key: number | string, notice: boolean) => (
    <BotBubble key={key}>
      <ThinkingDots label={notice ? RETRYING_NOTICE : undefined} />
      {notice && <p className="m-0 mt-1 text-sm text-ink-sub">{RETRYING_NOTICE}</p>}
    </BotBubble>
  )

  return (
    <div className="flex flex-col gap-4 px-4 pb-28 pt-5">
      <div className="self-center rounded-full bg-surface px-2.5 py-1 text-xs text-ink-muted">
        {dayLabel(sorted[0]?.createdAt)}
      </div>

      {sorted.map((m, i) => {
        if (m.role === 'USER') {
          return (
            <UserBubble key={m.messageId} blocked={m.messageType === 'BLOCKED'}>
              {m.content}
            </UserBubble>
          )
        }

        if (m.status === 'GENERATING') {
          return thinkingBubble(m.messageId, i === sorted.length - 1 && retrying)
        }

        if (FAIL_STATUSES.has(m.status)) {
          const isLast = i === sorted.length - 1
          const question = sorted[i - 1]?.role === 'USER' ? sorted[i - 1].content : null
          return (
            <BotBubble key={m.messageId} tone="error" meta="답변을 받지 못했어요">
              <p className="m-0">{m.content || (isLast && errorMessage) || FALLBACK_ERROR}</p>
              {isLast && question && retryableExecutionId != null && retryButton(question, retryableExecutionId)}
            </BotBubble>
          )
        }

        const typing = status === 'streaming' && m.messageId === typingMessageId
        const { tone, meta } = toneOf(m)
        const showExtras = !typing
        const rateable = showExtras && canRate(m) && sessionId != null
        // 듣기 버튼은 말풍선 안 오른쪽 아래. "참고한 정보"가 있으면 그 줄 오른쪽 끝에 같이 둔다
        const listen = showExtras && canListen(m) ? <ListenButton messageId={m.messageId} /> : null
        const hasSources = showExtras && m.messageType === 'ANSWER' && m.answerBasis === 'GROUNDED'
        return (
          <BotBubble
            key={m.messageId}
            tone={tone}
            meta={meta}
            actions={
              rateable ? (
                <FeedbackButtons sessionId={sessionId} messageId={m.messageId} myFeedback={m.myFeedback} isUser={isUser} />
              ) : undefined
            }
            after={
              !showExtras || m.messageId !== lastAnswerId ? undefined : m.followUps?.some((s) => s.trim()) ? (
                // 선택지·추천 질문이 있으면 먼저 그린다 (업무 되묻기는 followUps가 선택지 — 버튼 글자를 그대로 보낸다)
                <FollowUps items={m.followUps} disabled={busy || closed || askLocked} onAsk={onAsk} choices={m.messageType === 'CLARIFICATION'} />
              ) : isLocationAsk(m) && !closed ? (
                // 어느 지역인지 되물었을 때(선택지 없음): 현재 위치로 답하거나 지도에서 직접 찾는다
                <LocationAskChips disabled={busy || askLocked} locked={askLocked} onAsk={onAsk} />
              ) : undefined
            }
          >
            <AnswerText text={m.content ?? ''} typing={typing} onTyped={onTyped} />
            {showExtras && m.storeResults && m.storeResults.length > 0 && (
              <StoreResults items={m.storeResults} context={m.storeSearchContext} closed={closed || askLocked} />
            )}
            {hasSources ? (
              <SourceList messageId={m.messageId} trailing={listen} />
            ) : (
              listen && <div className="-mb-1 mt-2 flex justify-end">{listen}</div>
            )}
          </BotBubble>
        )
      })}

      {showPending && <PendingUserBubble failed={showSendError} />}

      {showThinking && thinkingBubble('thinking', retrying)}

      {showSendError && pendingQuestion && (
        <BotBubble
          tone={guestLimited ? 'notice' : 'error'}
          meta={guestLimited ? '비회원 질문 한도' : '질문을 보내지 못했어요'}
        >
          <p className="m-0">{errorMessage ?? FALLBACK_ERROR}</p>
          {!guestLimited && retryButton(pendingQuestion, null)}
        </BotBubble>
      )}

    </div>
  )
}
