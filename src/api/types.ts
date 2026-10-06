/** 백엔드 공통 응답 (global/common/CustomResponse) */
export interface CustomResponse<T> {
  isSuccess: boolean
  code: string
  message: string
  result: T
}

// ---- 채팅 (TEL-ME_BE develop 기준) ----
export type SessionStatus = 'ACTIVE' | 'NEED_CLARIFICATION' | 'CLOSED'
export type MessageRole = 'USER' | 'ASSISTANT'
export type MessageType = 'QUESTION' | 'ANSWER' | 'CLARIFICATION' | 'STORE_RESULT' | 'ERROR'
export type MessageStatus = 'GENERATING' | 'COMPLETED' | 'FAILED' | 'TIMEOUT' | 'CANCELLED'
export type AnswerBasis = 'GROUNDED' | 'NO_EVIDENCE' | 'OUT_OF_SCOPE'
export type ExecutionStatus = 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'

export interface ChatSession {
  sessionId: number
  title: string | null
  status: SessionStatus
  createdAt: string
  lastActiveAt: string
}

export interface ChatSessionList {
  sessions: ChatSession[]
  nextCursor: string | null
  hasNext: boolean
}

export type Rating = 'LIKE' | 'DISLIKE'
export type DislikeReason = 'WRONG_INFO' | 'NOT_RELATED' | 'HARD_TO_READ'

export interface MyFeedback {
  rating: Rating
  reason: DislikeReason | null
  comment: string | null
}

export interface ChatMessage {
  messageId: number
  sequenceNo: number
  replyToMessageId: number | null
  role: MessageRole
  messageType: MessageType
  content: string | null
  status: MessageStatus
  answerBasis: AnswerBasis | null
  followUps: string[] | null
  storeResults: Record<string, unknown>[] | null
  createdAt: string
  completedAt: string | null
  ratable: boolean
  myFeedback: MyFeedback | null
}

export interface ChatMessageHistory {
  messages: ChatMessage[]
  nextBeforeSequenceNo: number | null
  hasOlderMessages: boolean
  /** 답변 생성 중이면 그 실행 ID. 새로고침 후 이 값으로 SSE를 다시 구독한다 */
  runningExecutionId: number | null
}

export interface ChatMessageSendResponse {
  sessionId: number
  messageId: number
  sequenceNo: number
  executionId: number
  executionStatus: ExecutionStatus
  createdAt: string
}

export interface ChatSource {
  faqId: number
  title: string
  searchRank: number
  score: number
}

export interface ChatSources {
  messageId: number
  sources: ChatSource[]
}

/** SSE complete 이벤트 데이터. 답변 본문은 없으므로 받은 뒤 메시지 목록을 다시 불러온다 */
export interface ChatExecutionState {
  sessionId: number
  executionId: number
  status: ExecutionStatus
  errorCode: string | null
  outputMessage: {
    sessionId: number
    executionId: number
    messageId: number
    sequenceNo: number
    messageType: MessageType
    status: MessageStatus
  } | null
}

/** SSE error 이벤트 데이터 */
export interface ChatFailure {
  status: 'FAILED' | 'TIMEOUT' | 'CANCELLED'
  errorCode: string
  message: string
}

// ---- 피드백 ----
export interface FeedbackSaveRequest {
  rating: Rating
  reason?: DislikeReason
  comment?: string
}

export interface FeedbackResponse {
  id: number
  messageId: number
  rating: Rating
  reason: DislikeReason | null
  comment: string | null
  createdAt: string
  updatedAt: string
}

// ---- 인증 ----
export interface LoginResponse {
  userId: number
  email: string
}

/** GET /api/v1/auth/me — 백엔드에 아직 없음(요청 예정). 지금은 MSW 가짜 응답 */
export interface Me {
  userId: number | null
  email: string | null
  /** 이메일 가입 때 받은 이름. 소셜 로그인은 아직 없음(백엔드 수정 보류) */
  name: string | null
  role: 'GUEST' | 'USER' | 'ADMIN'
}
