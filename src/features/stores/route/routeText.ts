import type { RouteMode, RouteStep, RouteStepType, StoreRoute } from '../../../api/stores'

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

/** 지도에 그릴 수 있는 좌표만 */
export function stepPoints(step: RouteStep) {
  return step.path.filter((c) => Number.isFinite(c.latitude) && Number.isFinite(c.longitude))
}

/**
 * 누르면 지도에서 그 구간을 보여 주는 단계: 좌표가 두 개 이상인 버스·지하철·도보·자전거.
 * 자동차는 단계가 하나뿐이라 전체 경로와 같아서 뺀다
 */
export function isFocusable(step: RouteStep): boolean {
  return step.type !== 'DRIVE' && stepPoints(step).length >= 2
}

/** 고른 구간 양 끝 이름표. 버스·지하철은 승차·하차, 걷거나 자전거로 가는 구간은 출발·도착 */
export function endLabels(step: RouteStep): { start: string; end: string } {
  return step.type === 'BUS' || step.type === 'SUBWAY' ? { start: '승차', end: '하차' } : { start: '출발', end: '도착' }
}

/**
 * 타는 곳·내리는 곳 이름. 카카오 안내 문구 끝의 "(원효로제1동주민센터 > 순천향대학병원.한남오거리)"에서 꺼낸다.
 * 문구 형식이 다르면 null (지도에는 "승차"·"하차"로만 표시한다)
 */
export function stopNames(step: RouteStep): { from: string; to: string } | null {
  const match = step.guidance?.match(/\(([^()]+?)\s*>\s*([^()]+?)\)\s*$/)
  if (!match) return null
  const from = match[1].trim()
  const to = match[2].trim()
  return from && to ? { from, to } : null
}
