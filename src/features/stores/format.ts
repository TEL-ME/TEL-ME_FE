import type { DayOfWeek, StoreHours } from '../../api/stores'

export interface LatLng {
  lat: number
  lng: number
}

/** 거리 표시: 1km 미만은 10m 단위, 그 이상은 0.1km 단위, 100km부터는 1km 단위 */
export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.max(10, Math.round(meters / 10) * 10)}m`
  if (meters < 100_000) return `${(meters / 1000).toFixed(1)}km`
  return `${Math.round(meters / 1000)}km`
}

/** 두 좌표 사이 직선거리(m). 백엔드 distanceMeters와 같은 뜻이다 */
export function distanceMeters(a: LatLng, b: LatLng): number {
  const R = 6_371_000
  const rad = (d: number) => (d * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return Math.round(2 * R * Math.asin(Math.sqrt(h)))
}

/**
 * 법정동코드 10자리에서 지역 검색에 쓸 앞자리만 남긴다 (백엔드 LocationLookupService.toRegionCode와 같은 규칙).
 * 하위 단위가 없으면 0으로 채워져 있어서(서울 강남구 = 1168000000), 그대로 보내면 아래 동이 안 걸린다.
 * 다섯째 자리가 0이면 4자리로 줄인다: 구가 있는 시(수원시 4111000000 → 4111)를 한 번에 찾기 위해서다.
 */
export function toRegionCode(legalDongCode: string | null | undefined): string | null {
  if (!legalDongCode || !/^\d{10}$/.test(legalDongCode)) return null
  if (legalDongCode.endsWith('00000000')) return legalDongCode.slice(0, 2)
  if (legalDongCode.endsWith('00000')) return legalDongCode[4] === '0' ? legalDongCode.slice(0, 4) : legalDongCode.slice(0, 5)
  if (legalDongCode.endsWith('00')) return legalDongCode.slice(0, 8)
  return legalDongCode
}

/**
 * 주소에서 시·군·구 이름을 뽑는다. "경기도 수원시 영통구 …" → "수원시 영통구", "서울특별시 강남구 …" → "강남구".
 * 시·군·구가 없는 주소(세종)는 null.
 */
export function districtName(address: string): string | null {
  const [, second, third] = address.trim().split(/\s+/)
  if (!second || !/[시군구]$/.test(second)) return null
  if (second.endsWith('시') && third && third.endsWith('구')) return `${second} ${third}`
  return second
}

export const DAYS: { key: DayOfWeek; label: string }[] = [
  { key: 'MONDAY', label: '월' },
  { key: 'TUESDAY', label: '화' },
  { key: 'WEDNESDAY', label: '수' },
  { key: 'THURSDAY', label: '목' },
  { key: 'FRIDAY', label: '금' },
  { key: 'SATURDAY', label: '토' },
  { key: 'SUNDAY', label: '일' },
]

/** Date.getDay()(일=0)를 요일 코드로 */
export function dayOfWeekOf(date: Date): DayOfWeek {
  return DAYS[(date.getDay() + 6) % 7].key
}

const hm = (t: string) => t.slice(0, 5)

/** 요일 한 줄의 영업시간 문구. 등록되지 않은 요일은 "정보 없음" */
export function hoursText(hours: StoreHours | undefined): string {
  if (!hours) return '정보 없음'
  if (hours.closed) return '휴무'
  if (!hours.openTime || !hours.closeTime) return '정보 없음'
  return `${hm(hours.openTime)} ~ ${hm(hours.closeTime)}`
}

/** 전화번호에서 tel: 링크에 쓸 숫자만 남긴다 */
export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, '')}`
}
