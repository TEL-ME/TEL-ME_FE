import { RotateCw } from 'lucide-react'
import type { ReactNode } from 'react'
import type { ChatCoordinates } from '../../../api/chat'
import type { ChatMessage } from '../../../api/types'
import FeedbackButtons from '../../feedback/FeedbackButtons'
import { isBusy, type ChatStatus } from '../chatRunStore'
import AnswerText from './AnswerText'
import { BotBubble, PendingUserBubble, UserBubble, type BotTone } from './Bubbles'
import FollowUps from './FollowUps'
import LocationAskChips from './LocationAskChips'
import SourceList from './SourceList'
import StoreResults from './StoreResults'
import { foldRetried } from '../foldRetried'
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
  onTyped: () => void
  /** coords는 "현재 위치 사용"으로 보낼 때만 있다 */
  onAsk: (question: string, coords?: ChatCoordinates) => void
  /** 종료된 대화: 빠른 답 버튼을 보여 주지 않는다 */
  closed?: boolean
  /** failedMessageId가 null이면 질문이 서버에 저장되기 전에 실패한 경우 */
  onRetry: (question: string, failedMessageId: number | null) => void
  /** 대화 맨 아래에 붙는 내용 (종료된 대화의 상담 요약) */
  footer?: ReactNode
}

const FAIL_STATUSES = new Set(['FAILED', 'TIMEOUT', 'CANCELLED'])
const FALLBACK_ERROR = '답변을 만들지 못했어요. 잠시 후 다시 시도해 주세요.'

/** 평가 가능한 답변: 백엔드가 ratable로 알려 준다 (완료된 상담 답변·매장 추천) */
const canRate = (m: ChatMessage) => m.ratable && m.status === 'COMPLETED'

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
  onTyped,
  onAsk,
  onRetry,
  closed = false,
  footer,
}: MessageListProps) {
  const busy = isBusy(status)
  const sorted = foldRetried(
    [...messages].sort((a, b) => a.sequenceNo - b.sequenceNo),
    pendingQuestion,
  )
  const last = sorted[sorted.length - 1]
  // 저장된 질문이 목록에 오면 대기 말풍선을 내린다. 서버가 내용을 가렸을 수 있어 글자가 아니라 번호로 찾는다
  const sentArrived = sentMessageId != null && sorted.some((m) => m.messageId === sentMessageId)
  const showPending =
    pendingQuestion != null && !sentArrived && !(last?.role === 'USER' && last.content === pendingQuestion)
  const lastIsGenerating = last?.role === 'ASSISTANT' && last.status === 'GENERATING'
  const showThinking = (status === 'sending' || status === 'thinking') && !lastIsGenerating
  // 질문이 서버에 저장되기 전에 실패한 경우 (세션 생성·전송 실패)
  const showSendError = status === 'failed' && showPending
  // 후속 질문은 맨 마지막 답변에만, 타자 효과가 끝난 뒤에 보인다
  const lastAnswerId =
    !showPending && last?.role === 'ASSISTANT' && last.status === 'COMPLETED' ? last.messageId : null

  const retryButton = (question: string, failedMessageId: number | null) => (
    <button
      type="button"
      disabled={busy}
      onClick={() => onRetry(question, failedMessageId)}
      className="mt-2.5 flex min-h-9 items-center gap-1.5 rounded-full bg-surface-2 px-3.5 text-sm font-semibold text-ink disabled:opacity-50"
    >
      <RotateCw size={15} strokeWidth={2} aria-hidden />
      다시 시도
    </button>
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
          return (
            <BotBubble key={m.messageId}>
              <ThinkingDots />
            </BotBubble>
          )
        }

        if (FAIL_STATUSES.has(m.status)) {
          const isLast = i === sorted.length - 1
          const question = sorted[i - 1]?.role === 'USER' ? sorted[i - 1].content : null
          return (
            <BotBubble key={m.messageId} tone="error" meta="답변을 받지 못했어요">
              <p className="m-0">{m.content || (isLast && errorMessage) || FALLBACK_ERROR}</p>
              {isLast && question && retryButton(question, m.messageId)}
            </BotBubble>
          )
        }

        const typing = status === 'streaming' && m.messageId === typingMessageId
        const { tone, meta } = toneOf(m)
        const showExtras = !typing
        return (
          <BotBubble
            key={m.messageId}
            tone={tone}
            meta={meta}
            actions={
              showExtras && canRate(m) && sessionId != null ? (
                <FeedbackButtons sessionId={sessionId} messageId={m.messageId} myFeedback={m.myFeedback} isUser={isUser} />
              ) : undefined
            }
            after={
              !showExtras || m.messageId !== lastAnswerId ? undefined : m.followUps?.some((s) => s.trim()) ? (
                // 선택지·추천 질문이 있으면 먼저 그린다 (업무 되묻기는 followUps가 선택지 — 버튼 글자를 그대로 보낸다)
                <FollowUps items={m.followUps} disabled={busy || closed} onAsk={onAsk} choices={m.messageType === 'CLARIFICATION'} />
              ) : isLocationAsk(m) && !closed ? (
                // 어느 지역인지 되물었을 때(선택지 없음): 현재 위치로 답하거나 지도에서 직접 찾는다
                <LocationAskChips disabled={busy} onAsk={onAsk} />
              ) : undefined
            }
          >
            <AnswerText text={m.content ?? ''} typing={typing} onTyped={onTyped} />
            {showExtras && m.storeResults && m.storeResults.length > 0 && (
              <StoreResults items={m.storeResults} context={m.storeSearchContext} closed={closed} />
            )}
            {showExtras && m.messageType === 'ANSWER' && m.answerBasis === 'GROUNDED' && (
              <SourceList messageId={m.messageId} />
            )}
          </BotBubble>
        )
      })}

      {showPending && <PendingUserBubble failed={showSendError} />}

      {showThinking && (
        <BotBubble>
          <ThinkingDots />
        </BotBubble>
      )}

      {showSendError && pendingQuestion && (
        <BotBubble tone="error" meta="질문을 보내지 못했어요">
          <p className="m-0">{errorMessage ?? FALLBACK_ERROR}</p>
          {retryButton(pendingQuestion, null)}
        </BotBubble>
      )}

      {footer}
    </div>
  )
}
