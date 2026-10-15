import type { NetworkType, Plan, ResourceUsage, TargetGroup } from '../../api/plans'

export const NETWORK_LABEL: Record<NetworkType, string> = { FIVE_G: '5G', LTE: 'LTE', BUDGET: '알뜰' }
export const TARGET_LABEL: Record<TargetGroup, string> = { GENERAL: '일반', YOUTH: '청소년', SENIOR: '시니어' }

/** 생년월일을 받아야 하는 요금제 (청소년·시니어) */
export const needsBirthDate = (plan: Pick<Plan, 'targetGroup'>) => plan.targetGroup !== 'GENERAL'

/** 약정 할인율과 기간 (백엔드 ContractPolicy) */
export const CONTRACT_MONTHS = 24
export const CONTRACT_DISCOUNT_PERCENT = 25
/** 약정 가입 시 월 할인액. 서버와 같은 계산(월정액 × 25% 내림) */
export const contractDiscount = (monthlyFee: number) => Math.floor((monthlyFee * CONTRACT_DISCOUNT_PERCENT) / 100)

export const won = (n: number) => `${n.toLocaleString('ko-KR')}원`

/** 1GB = 1024MB. 1GB 미만은 MB로, 그 이상은 소수 첫째 자리까지 GB로 */
export function formatData(mb: number): string {
  if (Math.abs(mb) < 1024) return `${Math.round(mb).toLocaleString('ko-KR')}MB`
  const gb = Math.round((mb / 1024) * 10) / 10
  return `${Number.isInteger(gb) ? gb : gb.toFixed(1)}GB`
}

export type UsageKind = 'data' | 'voice' | 'sms'

/** 사용량 수치를 단위와 함께 */
export function formatAmount(kind: UsageKind, value: number): string {
  if (kind === 'data') return formatData(value)
  return kind === 'voice' ? `${value.toLocaleString('ko-KR')}분` : `${value.toLocaleString('ko-KR')}건`
}

/** 요금제의 기본 제공량 */
export function planAllowance(plan: Plan): { data: string; voice: string; sms: string } {
  const gb = plan.dataGb
  return {
    data: plan.unlimited || gb == null ? '무제한' : `${Number.isInteger(gb) ? gb : Number(gb).toFixed(1)}GB`,
    voice: plan.voiceUnlimited || plan.voiceMinutes == null ? '무제한' : `${plan.voiceMinutes.toLocaleString('ko-KR')}분`,
    sms: plan.smsUnlimited || plan.smsCount == null ? '무제한' : `${plan.smsCount.toLocaleString('ko-KR')}건`,
  }
}

/** 사용량 막대 너비(%). 초과해도 100에서 멈춘다 */
export const barPercent = (u: ResourceUsage) => (u.unlimited || u.percent == null ? 0 : Math.min(100, Math.max(0, u.percent)))

/** 한도를 넘은 양 */
export const overAmount = (u: ResourceUsage) => (u.limit == null ? 0 : Math.max(0, u.used - u.limit))

// ---- 날짜 ----

/** 서버 시각(Instant)을 "2026년 11월 1일"로 */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`
}

/** 서버 시각을 "11월 1일 오전 9:00"로 (정지 종료처럼 시각까지 필요할 때) */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${d.toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' })}`
}

/** "2026-09-01"·"2026-09" → "2026-09" (월 이동 쿼리 값) */
export const toMonthKey = (value: string) => value.slice(0, 7)

/** 이 기기 기준 이번 달 (yyyy-MM) */
export function currentMonthKey(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

/** yyyy-MM에서 delta달 옮긴 달 */
export function shiftMonth(key: string, delta: number): string {
  const [y, m] = key.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** "2026-09" → "2026년 9월" */
export function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number)
  return `${y}년 ${m}월`
}
