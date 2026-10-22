import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import type { ChatMessage } from '../../../api/types'
import { GUEST_LIMIT_MESSAGE } from '../guestLimitStore'
import MessageList from './MessageList'

const RAW = '제 번호는 010-1234-5678이에요. 요금제 바꾸고 싶어요'
const MASKED = '제 번호는 010-****-****이에요. 요금제 바꾸고 싶어요'

const userMessage = (messageId: number, content: string): ChatMessage => ({
  messageId,
  sequenceNo: 1,
  replyToMessageId: null,
  role: 'USER',
  messageType: 'QUESTION',
  content,
  status: 'COMPLETED',
  answerBasis: null,
  followUps: null,
  storeResults: null,
  createdAt: new Date().toISOString(),
  completedAt: new Date().toISOString(),
  ratable: false,
  myFeedback: null,
})

const wrap = (ui: ReactNode) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  )

const base = {
  sessionId: 1,
  isUser: false,
  typingMessageId: null,
  errorMessage: null,
  onTyped: () => {},
  onAsk: () => {},
  onRetry: () => {},
}

describe('MessageList 보내는 중인 질문', () => {
  it('서버가 저장하기 전에는 원문 대신 대기 문구를 보여 준다', () => {
    wrap(<MessageList {...base} messages={[]} pendingQuestion={RAW} sentMessageId={null} status="sending" />)
    expect(screen.getByText('질문을 확인하고 있어요')).toBeInTheDocument()
    expect(screen.queryByText(RAW)).not.toBeInTheDocument()
  })

  it('저장된 질문이 목록에 오면 대기 문구를 내리고 서버가 가린 내용을 보여 준다', () => {
    wrap(
      <MessageList {...base} messages={[userMessage(10, MASKED)]} pendingQuestion={RAW} sentMessageId={10} status="sending" />,
    )
    expect(screen.getByText(MASKED)).toBeInTheDocument()
    expect(screen.queryByText('질문을 확인하고 있어요')).not.toBeInTheDocument()
    expect(screen.queryByText(RAW)).not.toBeInTheDocument()
  })

  it('보내지 못했을 때도 원문은 그리지 않고 다시 시도할 수 있게 한다', () => {
    wrap(
      <MessageList {...base} messages={[]} pendingQuestion={RAW} status="failed" errorMessage="연결이 불안정해요." />,
    )
    expect(screen.getByText('보내지 못한 질문이에요')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '다시 시도' })).toBeInTheDocument()
    expect(screen.queryByText(RAW)).not.toBeInTheDocument()
  })

  it('게스트 하루 질문 수에 걸려 거절되면 다시 시도 없이 안내만 한다', () => {
    wrap(
      <MessageList
        {...base}
        messages={[]}
        pendingQuestion={RAW}
        status="failed"
        errorMessage={GUEST_LIMIT_MESSAGE}
        guestLimited
      />,
    )
    expect(screen.getByText('비회원 질문 한도')).toBeInTheDocument()
    expect(screen.getByText(GUEST_LIMIT_MESSAGE)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '다시 시도' })).not.toBeInTheDocument()
  })

  it('오늘 질문을 모두 쓴 게스트는 후속 질문 칩을 누를 수 없다', () => {
    const answer: ChatMessage = {
      ...userMessage(2, '유심은 매장에서 재발급할 수 있어요.'),
      sequenceNo: 2,
      role: 'ASSISTANT',
      messageType: 'ANSWER',
      followUps: ['재발급 비용은 얼마예요?'],
    }
    wrap(<MessageList {...base} messages={[userMessage(1, '유심 재발급'), answer]} pendingQuestion={null} sentMessageId={null} status="idle" errorMessage={null} askLocked />)
    expect(screen.getByRole('button', { name: '재발급 비용은 얼마예요?' })).toBeDisabled()
  })
})


describe('MessageList 실패한 답변 다시 시도 (TELME-219)', () => {
  const failed: ChatMessage = {
    ...userMessage(2, ''),
    sequenceNo: 2,
    replyToMessageId: 1,
    role: 'ASSISTANT',
    messageType: 'ANSWER',
    content: null,
    status: 'FAILED',
  }
  const list = [userMessage(1, '유심 재발급'), failed]

  it('다시 시도할 수 있는 실패면 버튼을 누를 때 그 실행 ID를 넘긴다', () => {
    const onRetry = vi.fn()
    wrap(<MessageList {...base} messages={list} pendingQuestion={null} status="failed" retryableExecutionId={10} onRetry={onRetry} />)
    fireEvent.click(screen.getByRole('button', { name: '다시 시도' }))
    expect(onRetry).toHaveBeenCalledWith('유심 재발급', 10)
  })

  it('다시 시도할 수 없는 실패(이미 다시 시도함 등)는 버튼을 그리지 않는다', () => {
    wrap(<MessageList {...base} messages={list} pendingQuestion={null} status="idle" retryableExecutionId={null} />)
    expect(screen.getByText('답변을 받지 못했어요')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '다시 시도' })).not.toBeInTheDocument()
  })

  it('서버가 자동으로 다시 시도하는 중이면 안내 문구를 보여 준다', () => {
    wrap(<MessageList {...base} messages={[userMessage(1, '유심 재발급')]} pendingQuestion={null} status="thinking" retrying />)
    expect(screen.getByText('답변 생성이 지연돼 다시 시도하고 있어요')).toBeInTheDocument()
  })

  it('다시 시도하는 동안에는 실패 말풍선 대신 대기 말풍선 하나만 보인다', () => {
    wrap(<MessageList {...base} messages={list} pendingQuestion={null} status="thinking" retrying />)
    expect(screen.queryByText('답변을 받지 못했어요')).not.toBeInTheDocument()
    expect(screen.getAllByRole('status')).toHaveLength(1)
    expect(screen.getByText('답변 생성이 지연돼 다시 시도하고 있어요')).toBeInTheDocument()
  })
})
