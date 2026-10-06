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
  questionPreview: string
  createdAt: string
}

export interface UnansweredDetail {
  messageId: number
  sessionId: number
  type: UnansweredType
  question: string
  answer: string | null
  createdAt: string
  sources: AdminSource[]
}

type UnansweredPage = { messages: UnansweredListItem[] } & Page

export const adminUnansweredApi = {
  list: (q: PeriodQuery & { type?: UnansweredType }) =>
    api<UnansweredPage>('/api/v1/admin/unanswered', { query: { ...q } }),
  /**
   * 유형 여러 개로 조회 (비우면 전체).
   * 임시: 백엔드가 아직 유형을 하나만 받아서, 여러 개면 유형별로 불러 최신순으로 합친다
   * (한 페이지에 유형 수만큼 행이 나올 수 있음). 백엔드가 여러 유형을 받게 되면 이 함수만 한 번 호출로 바꾼다.
   */
  listByTypes: async ({ types, ...q }: PeriodQuery & { types: UnansweredType[] }): Promise<UnansweredPage> => {
    if (types.length <= 1) return adminUnansweredApi.list({ ...q, type: types[0] })
    const pages = await Promise.all(types.map((type) => adminUnansweredApi.list({ ...q, type })))
    return {
      ...pages[0],
      messages: pages.flatMap((p) => p.messages).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      totalElements: pages.reduce((n, p) => n + p.totalElements, 0),
      totalPages: Math.max(...pages.map((p) => p.totalPages)),
    }
  },
  get: (messageId: number) => api<UnansweredDetail>(`/api/v1/admin/unanswered/${messageId}`),
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
