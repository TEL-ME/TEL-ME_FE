import { api } from './client'

// ---- 요금제 · 가입 · 사용량 (TEL-ME_BE develop: TELME-151 · TELME-153 기준) ----

export type NetworkType = 'FIVE_G' | 'LTE' | 'BUDGET'
export type TargetGroup = 'GENERAL' | 'YOUTH' | 'SENIOR'

/** 요금제. 무제한이면 dataGb·voiceMinutes·smsCount가 null이고 unlimited·voiceUnlimited·smsUnlimited가 true */
export interface Plan {
  planId: number
  code: string
  name: string
  networkType: NetworkType
  targetGroup: TargetGroup
  monthlyFee: number
  dataGb: number | null
  unlimited: boolean
  voiceMinutes: number | null
  voiceUnlimited: boolean
  smsCount: number | null
  smsUnlimited: boolean
}

export interface ScheduledPlan {
  plan: Plan
  /** 적용(개통) 시각 */
  effectiveFrom: string
}

/** 약정. 만료되면 active=false이고 monthlyDiscount=0 */
export interface Contract {
  months: number
  discountPercent: number
  monthlyDiscount: number
  active: boolean
  endsAt: string
}

/** 일시 정지. reducedMonthlyFee는 정지 기간 기본료(원) */
export interface Pause {
  startedAt: string
  endsAt: string
  reducedMonthlyFee: number
}

/** 가입 정보. 개통 전이면 currentPlan이 null이고 pendingActivation이 있다. 해당 없는 항목은 null */
export interface Subscription {
  subscriptionId: number
  subscribedAt: string
  currentPlan: Plan | null
  contract: Contract | null
  pendingActivation: ScheduledPlan | null
  pendingChange: ScheduledPlan | null
  pause: Pause | null
}

export interface SubscriptionMe {
  subscribed: boolean
  subscription: Subscription | null
}

/** 해지 위약금. 약정이 없으면 hasContract=false, contractMonths=null, 나머지 0 */
export interface TerminationPenalty {
  hasContract: boolean
  contractMonths: number | null
  elapsedMonths: number
  receivedDiscount: number
  refundPercent: number
  penalty: number
}

/** 사용량 한 항목. 데이터는 MB, 통화는 분, 문자는 건. 무제한이면 limit·remaining·percent가 null */
export interface ResourceUsage {
  used: number
  limit: number | null
  remaining: number | null
  /** 한도를 넘으면 100보다 클 수 있다 */
  percent: number | null
  unlimited: boolean
  exceeded: boolean
}

/** 예상 요금. 지난달에 가입 전이었으면 previousAmount·difference가 null */
export interface ExpectedFee {
  amount: number
  previousAmount: number | null
  difference: number | null
  /** 이번 달 중간에 요금제가 바뀌어 날짜만큼 나눠 계산했으면 true */
  prorated?: boolean
}

/** 한 달 사용량. daysUntilBilling·paused·expectedFee는 이번 달에만 있고 지난 달은 null */
export interface MonthUsage {
  /** 그 달 1일 (yyyy-MM-dd) */
  month: string
  daysUntilBilling: number | null
  paused: boolean | null
  data: ResourceUsage
  voice: ResourceUsage
  sms: ResourceUsage
  expectedFee: ExpectedFee | null
}

/**
 * 사용량 조회 결과. 미가입(NOT_SUBSCRIBED)·개통 전(PENDING_ACTIVATION)은 오류가 아니라 상태다.
 * usage·availableFrom·availableTo는 ACTIVE일 때만, activatesAt은 PENDING_ACTIVATION일 때만 있다
 */
export interface UsageOverview {
  status: 'NOT_SUBSCRIBED' | 'PENDING_ACTIVATION' | 'ACTIVE'
  activatesAt: string | null
  /** 조회 가능한 첫 달·마지막 달 (각 달 1일) */
  availableFrom: string | null
  availableTo: string | null
  usage: MonthUsage | null
}

export interface PlanFilter {
  networkType?: NetworkType
  targetGroup?: TargetGroup
}

export const planApi = {
  list: (filter: PlanFilter = {}, signal?: AbortSignal) =>
    api<{ plans: Plan[] }>('/api/v1/plans', { query: { ...filter }, signal }).then((r) => r.plans),
  detail: (planId: number) => api<Plan>(`/api/v1/plans/${planId}`),
}

const SUB = '/api/v1/subscriptions'

export const subscriptionApi = {
  me: () => api<SubscriptionMe>(`${SUB}/me`),
  /** contract=true면 24개월 약정. birthDate(yyyy-MM-dd)는 청소년·시니어 요금제에서 저장된 값이 없을 때만 필요 */
  subscribe: (body: { planId: number; birthDate?: string; contract: boolean }) =>
    api<Subscription>(SUB, { method: 'POST', body }),
  changePlan: (body: { planId: number; birthDate?: string }) => api<Subscription>(`${SUB}/plan`, { method: 'PATCH', body }),
  /** 해지. 응답은 적용된 위약금 */
  cancel: () => api<TerminationPenalty>(SUB, { method: 'DELETE' }),
  /** 해지 전 예상 위약금 */
  penalty: () => api<TerminationPenalty>(`${SUB}/me/termination-penalty`),
  /** 일시 정지 (1~30일) */
  pause: (days: number) => api<Subscription>(`${SUB}/pause`, { method: 'POST', body: { days } }),
  resume: () => api<Subscription>(`${SUB}/pause`, { method: 'DELETE' }),
}

export const usageApi = {
  /** month는 yyyy-MM. 생략하면 이번 달. 범위 밖이면 400(USAGE400-0) */
  me: (month?: string, signal?: AbortSignal) => api<UsageOverview>('/api/v1/usage/me', { query: { month }, signal }),
}
