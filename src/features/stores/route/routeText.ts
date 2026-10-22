import type { RouteMode, RouteStepType, StoreRoute } from '../../../api/stores'

export const ROUTE_MODES: { mode: RouteMode; label: string }[] = [
  { mode: 'TRANSIT', label: '대중교통' },
  { mode: 'CAR', label: '자동차' },
  { mode: 'WALK', label: '도보' },
  { mode: 'BICYCLE', label: '자전거' },
]

export const MODE_LABEL: Record<RouteMode, string> = {
  TRANSIT: '대중교통',
  CAR: '자동차',
  WALK: '도보',
  BICYCLE: '자전거',
}

export const STEP_LABEL: Record<RouteStepType, string> = {
  DRIVE: '운전',
  WALK: '도보',
  BICYCLE: '자전거',
  BUS: '버스',
  SUBWAY: '지하철',
}

/** 걸리는 시간: 1분 미만 · 12분 · 1시간 5분 */
export function durationText(seconds: number): string {
  if (seconds < 60) return '1분 미만'
  const minutes = Math.round(seconds / 60)
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}분`
  return m === 0 ? `${h}시간` : `${h}시간 ${m}분`
}

/** 요금. null은 "정보 없음"이라 무료로 보여 주지 않고 아예 숨긴다 */
export function fareText(fare: number | null): string | null {
  return fare == null ? null : `${fare.toLocaleString('ko-KR')}원`
}

/** 환승. 0은 환승 없음, null은 정보 없음이라 숨긴다 */
export function transfersText(transfers: number | null): string | null {
  if (transfers == null) return null
  return transfers === 0 ? '환승 없음' : `환승 ${transfers}회`
}

/** 출발지와 매장이 같은 곳이라 갈 필요가 없을 때의 성공 응답 */
export function isArrived(route: StoreRoute): boolean {
  return route.distanceMeters === 0 && route.durationSeconds === 0 && route.steps.length === 0
}
