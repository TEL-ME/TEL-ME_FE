import { api } from './client'

/** 관리자 API (TEL-ME_BE develop 기준, /api/v1/admin/** — ADMIN만) */

export interface Page {
  page: number
  size: number
  totalElements: number
  totalPages: number
}

// ---- FAQ ----
export const FAQ_CATEGORIES = [
  ['BILLING', '요금'],
  ['PLAN', '요금제'],
  ['USIM', '유심'],
  ['SUBSCRIBE', '가입'],
  ['PORTING', '번호이동'],
  ['NAME_CHANGE', '명의변경'],
  ['TERMINATE', '해지'],
  ['DEVICE', '단말'],
  ['ROAMING', '로밍'],
  ['SERVICE', '서비스'],
] as const
export type FaqCategory = (typeof FAQ_CATEGORIES)[number][0]
export const categoryLabel = (c: string) => FAQ_CATEGORIES.find(([k]) => k === c)?.[1] ?? c

export type FaqStatus = 'ACTIVE' | 'HIDDEN' | 'DELETED'
export type FaqStatusFilter = FaqStatus | 'ALL'
export type FaqSort = 'RECENT' | 'CITATION_DESC' | 'CITATION_ASC'

export interface FaqListItem {
  faqId: number
  category: FaqCategory
  question: string
  version: number
  status: FaqStatus
  citationCount: number
  updatedAt: string
}

export interface FaqDetail extends FaqListItem {
  answer: string
  policyRef: string | null
  lockVersion: number
  contentHash: string
  createdBy: number | null
  updatedBy: number | null
  createdAt: string
}

export interface FaqSave {
  category: FaqCategory
  question: string
  answer: string
  policyRef?: string | null
  status?: FaqStatus
  /** 조회 때 받은 값. 그 사이 다른 관리자가 저장했으면 FAQ409-1 */
  lockVersion?: number
}

export interface FaqQuery {
  keyword?: string
  category?: FaqCategory
  status?: FaqStatusFilter
  sort?: FaqSort
  page?: number
  size?: number
}

export const adminFaqApi = {
  list: (q: FaqQuery) => api<{ faqs: FaqListItem[] } & Page>('/api/v1/admin/faqs', { query: { ...q } }),
  get: (id: number) => api<FaqDetail>(`/api/v1/admin/faqs/${id}`),
  create: (body: FaqSave) => api<FaqDetail>('/api/v1/admin/faqs', { method: 'POST', body }),
  update: (id: number, body: FaqSave) => api<FaqDetail>(`/api/v1/admin/faqs/${id}`, { method: 'PUT', body }),
  /** 공개(ACTIVE)·숨김(HIDDEN) 전환. 삭제된 FAQ를 ACTIVE로 바꾸면 복구 */
  setStatus: (id: number, status: 'ACTIVE' | 'HIDDEN', lockVersion?: number) =>
    api<FaqDetail>(`/api/v1/admin/faqs/${id}/status`, { method: 'PUT', body: { status, lockVersion } }),
  /** 상태를 DELETED로 (되돌릴 수 있음) */
  remove: (id: number, lockVersion?: number) =>
    api<null>(`/api/v1/admin/faqs/${id}`, { method: 'DELETE', query: { lockVersion } }),
  /** 행을 실제로 지운다. 서버가 DELETED이고 인용 0회인 FAQ만 허용해서 lockVersion은 보내지 않는다 */
  purge: (id: number) => api<null>(`/api/v1/admin/faqs/${id}/permanent`, { method: 'DELETE' }),
}

// ---- 답변 품질: 싫어요 피드백 ----
export type ReasonCode = 'WRONG_INFO' | 'NOT_RELATED' | 'HARD_TO_READ'
export type HandledFilter = 'UNHANDLED' | 'HANDLED' | 'ALL'

export interface AdminSource {
  faqId: number | null
  titleSnapshot: string
  faqVersion: number | null
  searchRank: number
  score: number
}

export interface FeedbackListItem {
  feedbackId: number
  reasonCode: ReasonCode
  questionPreview: string
  commentPreview: string | null
  createdAt: string
  updatedAt: string
  handled: boolean
}

export interface FeedbackDetail {
  feedbackId: number
  reasonCode: ReasonCode
  comment: string | null
  createdAt: string
  updatedAt: string
  handled: boolean
  handledAt: string | null
  handledBy: number | null
  handledNote: string | null
  messageId: number
  question: string
  answer: string
  answerBasis: string | null
  answeredAt: string
  sources: AdminSource[]
}

export interface PeriodQuery {
  from?: string
  to?: string
  page?: number
  size?: number
}

export const adminFeedbackApi = {
  list: (q: PeriodQuery & { reason?: ReasonCode; handled?: HandledFilter }) =>
    api<{ feedbacks: FeedbackListItem[] } & Page>('/api/v1/admin/feedbacks', { query: { ...q } }),
  get: (id: number) => api<FeedbackDetail>(`/api/v1/admin/feedbacks/${id}`),
  /** updatedAt: 조회 때 받은 값. 그 사이 사용자가 피드백을 고쳤으면 FEEDBACK409-1 */
  setHandled: (id: number, handled: boolean, updatedAt?: string, note?: string) =>
    api<FeedbackDetail>(`/api/v1/admin/feedbacks/${id}/handled`, { method: 'PUT', body: { handled, note, updatedAt } }),
}

// ---- 답변 품질: 답 못 한 질문 ----
export type UnansweredType = 'NO_EVIDENCE' | 'OUT_OF_SCOPE' | 'FAILED' | 'TIMEOUT'

export interface UnansweredListItem {
  messageId: number
  sessionId: number
  type: UnansweredType
  /** 이 답변을 요청한 사용자 메시지. 되묻기 뒤에는 조건 답변(예: 마포구)이 들어 있다 */
  questionPreview: string
  /** 되묻기가 있었으면 상담을 시작한 원래 질문. 없으면 null */
  originQuestionPreview: string | null
  createdAt: string
}

/** 화면에 보여 줄 질문: 원래 질문이 있으면 그것, 없으면 요청 메시지 */
export const mainQuestion = (m: { questionPreview: string; originQuestionPreview: string | null }) =>
  m.originQuestionPreview || m.questionPreview

export interface UnansweredDetail {
  messageId: number
  sessionId: number
  type: UnansweredType
  /** 되묻기 뒤에는 조건 답변이 들어 있다 */
  question: string
  /** 되묻기가 있었으면 상담을 시작한 원래 질문. 없으면 null */
  originQuestion: string | null
  answer: string | null
  createdAt: string
  sources: AdminSource[]
}

type UnansweredPage = { messages: UnansweredListItem[] } & Page

export const adminUnansweredApi = {
  /** 유형은 여러 개 줄 수 있다 (type=FAILED&type=TIMEOUT). 비우면 전체 */
  list: ({ types, ...q }: PeriodQuery & { types?: UnansweredType[] }) =>
    api<UnansweredPage>('/api/v1/admin/unanswered', { query: { ...q, type: types?.length ? types : undefined } }),
  get: (messageId: number) => api<UnansweredDetail>(`/api/v1/admin/unanswered/${messageId}`),
}

// ---- 대시보드 ----
/** GET /admin/dashboard. from·to는 답 못 한 질문 수·실패한 답변 수에만 걸린다 */
export interface DashboardSummary {
  unansweredCount: number
  /** 기간과 상관없이 전체 */
  unhandledFeedbackCount: number
  failedAnswerCount: number
  /** 한국 시간 자정 기준 */
  todayQuestionCount: number
  yesterdayQuestionCount: number
}

/** GET /admin/dashboard/daily — 오늘 포함 최근 7일, 오래된 날부터. 기록 없는 날도 0 */
export interface DashboardDay {
  /** YYYY-MM-DD */
  date: string
  questionCount: number
  errorCount: number
}

/** 질문 의도: FAQ 문의 · 매장 찾기 · 둘 다 · 미분류 */
export type IntentType = 'FAQ' | 'STORE' | 'BOTH' | 'UNKNOWN'
/** RULE: 규칙(장애 대체·규칙 보정 포함) · LLM · UNRECORDED: 방법 기록 없음 */
export type ClassificationMethod = 'RULE' | 'LLM' | 'UNRECORDED'

/**
 * GET /admin/dashboard/intent-distribution
 * - 0건인 항목도 항상 들어 있고 순서가 고정이다 (의도 FAQ·STORE·BOTH·UNKNOWN / 방법 RULE·LLM·UNRECORDED)
 * - percentage는 소수 둘째 자리 반올림이라 합이 100이 아닐 수 있다
 * - to는 끝 시각 제외. 기간을 비우면 응답의 from·to가 null(전체 기간). 응답 시각은 UTC
 */
export interface IntentDistribution {
  from: string | null
  to: string | null
  /** 기간 안 분류 기록 수 (전체 질문 수와 다를 수 있음) */
  totalCount: number
  intents: { intent: IntentType; count: number; percentage: number }[]
  methods: { method: ClassificationMethod; count: number; percentage: number }[]
}

export const adminDashboardApi = {
  intentDistribution: (q: { from?: string; to?: string } = {}) =>
    api<IntentDistribution>('/api/v1/admin/dashboard/intent-distribution', { query: { ...q } }),
  summary: (q: { from?: string; to?: string } = {}) => api<DashboardSummary>('/api/v1/admin/dashboard', { query: { ...q } }),
  daily: () => api<{ days: DashboardDay[] }>('/api/v1/admin/dashboard/daily'),
}

// ---- 운영 상태 ----
/** LLM 작업 종류 (백엔드 LlmGeneration.TaskType) */
export type LlmTaskType =
  | 'ROUTING'
  | 'CONTEXT_RESOLUTION'
  | 'RAG_ANSWER'
  | 'CLARIFICATION'
  | 'CONDITION_EXTRACT'
  | 'FOLLOW_UP'
  | 'SUMMARY'
  | 'SESSION_TITLE'

export const LLM_TASKS: [LlmTaskType, string][] = [
  ['ROUTING', '의도 분류'],
  ['CONTEXT_RESOLUTION', '문맥 연결'],
  ['RAG_ANSWER', '답변 생성'],
  ['CLARIFICATION', '되묻기'],
  ['CONDITION_EXTRACT', '조건 추출'],
  ['FOLLOW_UP', '추천 질문'],
  ['SUMMARY', '대화 요약'],
  ['SESSION_TITLE', '대화 제목'],
]
export const taskLabel = (t: string) => LLM_TASKS.find(([k]) => k === t)?.[1] ?? t

/**
 * 운영 상태 화면에서 숨기는 작업: 문맥 연결·되묻기·추천 질문.
 * 대부분 고정 문장·규칙으로 처리돼 LLM 호출 기록이 거의 남지 않아 0건으로만 보인다.
 */
export const HIDDEN_TASKS = new Set<string>(['CONTEXT_RESOLUTION', 'CLARIFICATION', 'FOLLOW_UP'])
export const VISIBLE_TASKS = LLM_TASKS.filter(([k]) => !HIDDEN_TASKS.has(k))

export type LlmErrorType = 'TIMEOUT' | 'CONNECTION_FAILED' | 'MODEL_ERROR'

export interface LlmErrorItem {
  generationId: number
  createdAt: string
  errorType: LlmErrorType
  taskType: LlmTaskType
  /** 몇 번째 시도였는지 (재시도한 호출은 시도마다 한 건) */
  attempt: number
  model: string | null
  totalMs: number | null
  errorMessage: string | null
  executionId: number | null
}

/** 건수가 0이면 시간 값은 null */
export interface LatencyStats {
  count: number
  avgMs: number | null
  p50Ms: number | null
  p95Ms: number | null
}

export interface Latency {
  from: string
  to: string
  /** 질문을 받은 때부터 답변 저장까지 (완료된 실행만) */
  overall: LatencyStats
  /** 답변 생성 LLM의 첫 토큰까지 */
  firstToken: LatencyStats
  tasks: (LatencyStats & { taskType: LlmTaskType })[]
}

/** min 이상 max 미만 (마지막 칸만 1.0 포함) */
export interface SearchScoreBucket {
  min: number
  max: number
  count: number
}

/**
 * 검색 점수 분포 (TELME-123). 상담에서 질문마다 처음 한 FAQ 검색 기준.
 * - total: 질문 수 / scored: 질문+답변 벡터(Q_A) 1위 점수가 있는 질문 수(= buckets 합)
 * - passed: 첫 검색으로 근거를 찾은 질문 / refinedPassed: 첫 검색은 비었지만 정제 질문으로 찾은 질문
 * - aboveThreshold: 1위 점수가 검색 당시 임계값 이상인 질문 / buckets: 0~1을 0.05 간격 20칸
 */
export interface SearchScores {
  threshold: number
  total: number
  scored: number
  passed: number
  refinedPassed: number
  aboveThreshold: number
  buckets: SearchScoreBucket[]
}

export const adminSystemApi = {
  /** 비우면 errorType은 세 종류 전체, taskType은 모든 작업 */
  errors: (q: PeriodQuery & { errorType?: LlmErrorType; taskType?: LlmTaskType }) =>
    api<{ errors: LlmErrorItem[] } & Page>('/api/v1/admin/system/errors', { query: { ...q } }),
  /** 기간을 비우면 최근 24시간 */
  latency: (q: { from?: string; to?: string } = {}) => api<Latency>('/api/v1/admin/system/latency', { query: { ...q } }),
  /** 기간을 비우면 전체 (기록은 90일 보관) */
  searchScores: (q: { from?: string; to?: string } = {}) =>
    api<SearchScores>('/api/v1/admin/system/search-scores', { query: { ...q } }),
}

// ---- 매장 ----
export type StoreStatusFilter = 'OPEN' | 'CLOSED_DOWN' | 'ALL'

export interface StoreService {
  code: string
  name: string
}

export interface AdminStoreListItem {
  storeId: number
  name: string
  address: string
  phone: string | null
  services: StoreService[]
  status: string
  updatedAt: string
}

export type DayOfWeek = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY'

export interface StoreHours {
  dayOfWeek: DayOfWeek
  /** "HH:mm" 또는 "HH:mm:ss". 휴무면 null */
  openTime: string | null
  closeTime: string | null
  closed: boolean
}

export interface AdminStoreDetail extends Omit<AdminStoreListItem, 'services'> {
  regionCode: string | null
  latitude: number
  longitude: number
  hours: StoreHours[]
  services: StoreService[]
  createdAt: string
  lockVersion: number
}

/** 등록·수정 요청 (상태는 받지 않는다. 폐점은 삭제 API로만) */
export interface AdminStoreSave {
  name: string
  address: string
  phone: string | null
  /** 법정동코드 숫자 10자리 */
  regionCode: string
  latitude: number
  longitude: number
  /** 월~일 7일 모두 */
  hours: StoreHours[]
  /** 1개 이상 */
  serviceCodes: string[]
  /** 수정 때 필수 */
  lockVersion?: number
}

export const adminStoreApi = {
  list: (q: { keyword?: string; status?: StoreStatusFilter; page?: number; size?: number }) =>
    api<{ stores: AdminStoreListItem[] } & Page>('/api/v1/admin/stores', { query: { ...q } }),
  get: (id: number) => api<AdminStoreDetail>(`/api/v1/admin/stores/${id}`),
  serviceTypes: () => api<StoreService[]>('/api/v1/admin/stores/service-types'),
  create: (body: AdminStoreSave) => api<AdminStoreDetail>('/api/v1/admin/stores', { method: 'POST', body }),
  update: (id: number, body: AdminStoreSave) =>
    api<AdminStoreDetail>(`/api/v1/admin/stores/${id}`, { method: 'PUT', body }),
  /** 실제로 지우지 않고 폐점(CLOSED_DOWN)으로 바꾼다 */
  remove: (id: number) => api<null>(`/api/v1/admin/stores/${id}`, { method: 'DELETE' }),
}
