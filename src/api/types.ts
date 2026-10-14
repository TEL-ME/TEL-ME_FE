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
/** BLOCKED: 입력 검사(욕설·민감정보)에 걸려 답변을 만들지 않은 사용자 메시지 */
export type MessageType = 'QUESTION' | 'ANSWER' | 'CLARIFICATION' | 'STORE_RESULT' | 'ERROR' | 'BLOCKED'
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

/**
 * 매장 안내 답변에 담기는 매장 한 곳 (백엔드 ChatStoreResponse, TELME-103).
 * 예전에 저장된 메시지는 일부 값이 없을 수 있어서 화면에서는 있는 값만 골라 쓴다.
 */
export interface ChatStoreSnapshot {
  storeId: number
  name: string
  address: string
  phone: string | null
  /** 매장 좌표 (검색한 곳의 좌표가 아니다) */
  latitude: number
  longitude: number
  /** 검색 기준점에서의 직선거리. 지역 전체 검색이면 null */
  distanceMeters: number | null
}

/** 매장을 어떤 기준으로 찾았는지 (백엔드 ChatStoreSearchContextResponse) */
export interface StoreSearchContext {
  type: 'CURRENT_LOCATION' | 'REGION' | 'ADDRESS' | 'PLACE'
  /** 검색 기준 이름. 현재 위치로 찾았으면 "현재 위치" */
  label: string
  /** 실제로 찾은 반경. 지역 전체 검색이면 null */
  radiusMeters: number | null
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
  /** 매장을 찾은 기준. 매장 검색이 아니거나 예전 메시지면 없다 */
  storeSearchContext?: StoreSearchContext | null
}

export interface ChatMessageHistory {
  messages: ChatMessage[]
  nextBeforeSequenceNo: number | null
  hasOlderMessages: boolean
  /** 답변 생성 중이면 그 실행 ID. 새로고침 후 이 값으로 SSE를 다시 구독한다 */
  runningExecutionId: number | null
}

/**
 * 입력 검사 결과 (TELME-119)
 * - MASKED: 민감정보를 가리고 정상 접수 (실행 ID 있음)
 * - WARNED: 욕설 경고 · REWRITE_REQUIRED: 민감정보 빼고 다시 입력 · RESTRICTED: 일시 제한 (셋 다 실행 ID 없음)
 */
export type InputGuardAction = 'MASKED' | 'WARNED' | 'REWRITE_REQUIRED' | 'RESTRICTED'

export interface InputGuardNotice {
  action: InputGuardAction
  message: string
  violationCount: number
  retryAfterSeconds: number
  restrictionStartedAt: string | null
  restrictionUntil: string | null
  detections: { reason: string; ruleId: string }[]
}

export interface ChatMessageSendResponse {
  sessionId: number
  /** 이미 제한 중이면 메시지를 저장하지 않아 없다 */
  messageId?: number | null
  sequenceNo?: number | null
  /** 없으면 답변을 만들지 않은 것 (경고·재입력 안내·일시 제한). SSE를 구독하지 않는다 */
  executionId?: number | null
  executionStatus?: ExecutionStatus | null
  createdAt: string
  inputGuard?: InputGuardNotice | null
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

export type LoginMethod = 'EMAIL' | 'KAKAO'

/** GET /api/v1/auth/me — 로그인 안 했으면 200 + role GUEST */
export interface Me {
  authenticated: boolean
  userId: number | null
  email: string | null
  /** 이메일 가입 때 받은 이름, 카카오는 닉네임 */
  name: string | null
  role: 'GUEST' | 'USER' | 'ADMIN'
  loginMethods: LoginMethod[]
}
