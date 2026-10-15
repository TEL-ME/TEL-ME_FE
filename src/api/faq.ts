import { api } from './client'

/** 사용자 FAQ API (GET /api/v1/faqs). 관리자 화면과 카테고리 이름을 같이 쓴다 */

export const FAQ_CATEGORIES = [
  ['BILLING', '요금'],
  ['PLAN', '요금제'],
  ['USIM', '유심'],
  ['SUBSCRIBE', '가입'],
  ['PORTING', '번호이동'],
  ['NAME_CHANGE', '명의변경'],
  ['TERMINATE', '해지'],
  ['DEVICE', '기기'],
  ['ROAMING', '로밍'],
  ['SERVICE', '서비스'],
] as const
export type FaqCategory = (typeof FAQ_CATEGORIES)[number][0]
export const categoryLabel = (c: string) => FAQ_CATEGORIES.find(([k]) => k === c)?.[1] ?? c

/** POPULAR: 상담에서 많이 참고한 순 · RECENT: 최근 수정순 */
export type PublicFaqSort = 'POPULAR' | 'RECENT'

export interface PublicFaq {
  faqId: number
  category: FaqCategory
  question: string
  answer: string
}

export interface PublicFaqPage {
  faqs: PublicFaq[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export interface PublicFaqQuery {
  category?: FaqCategory
  /** 200자까지 */
  keyword?: string
  sort?: PublicFaqSort
  /** 0부터 */
  page?: number
  /** 1~100, 기본 20 */
  size?: number
}

/** 숨김·삭제된 FAQ를 열면 404 FAQ404-0 */
export const FAQ_GONE = 'FAQ404-0'

export const faqApi = {
  list: (query: PublicFaqQuery, signal?: AbortSignal) =>
    api<PublicFaqPage>('/api/v1/faqs', { query: { ...query }, signal }),
  detail: (faqId: number, signal?: AbortSignal) => api<PublicFaq>(`/api/v1/faqs/${faqId}`, { signal }),
}
