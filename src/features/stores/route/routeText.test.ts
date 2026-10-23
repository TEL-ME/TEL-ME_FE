import { describe, expect, it } from 'vitest'
import { ApiError } from '../../../api/client'
import { routeErrorView } from './routeError'
import type { RouteStep } from '../../../api/stores'
import { durationText, endLabels, fareText, groupTransitSteps, isArrived, isFocusable, needsOriginWalkCheck, routeLinesText, stopNames, transfersText } from './routeText'

describe('길찾기 문구', () => {
  it('시간', () => {
    expect(durationText(30)).toBe('1분 미만')
    expect(durationText(720)).toBe('12분')
    expect(durationText(3600)).toBe('1시간')
    expect(durationText(3900)).toBe('1시간 5분')
  })

  it('요금·환승의 null은 숨기고, 0원·환승 0회는 구분한다', () => {
    expect(fareText(null)).toBeNull()
    expect(fareText(0)).toBe('0원')
    expect(fareText(1450)).toBe('1,450원')
    expect(transfersText(null)).toBeNull()
    expect(transfersText(0)).toBe('환승 없음')
    expect(transfersText(2)).toBe('환승 2회')
  })

  it('거리·시간 0에 빈 단계면 도착', () => {
    const base = { mode: 'WALK' as const, fare: null, transfers: null }
    expect(isArrived({ ...base, distanceMeters: 0, durationSeconds: 0, steps: [] })).toBe(true)
    expect(isArrived({ ...base, distanceMeters: 10, durationSeconds: 8, steps: [] })).toBe(false)
  })
})

describe('길찾기 오류 안내', () => {
  const err = (status: number, code: string, message = '서버 문구') => new ApiError(status, code, message)

  it('코드별로 다시 시도·다른 수단·매장 목록을 정한다', () => {
    expect(routeErrorView(err(503, 'STORE503-4'), 'CAR')).toMatchObject({ message: '서버 문구', canRetry: false, suggestOtherMode: true })
    expect(routeErrorView(err(503, 'STORE503-3'), 'CAR')).toMatchObject({ message: '서버 문구', canRetry: false, suggestOtherMode: false })
    expect(routeErrorView(err(503, 'STORE503-2'), 'CAR')).toMatchObject({ canRetry: true, suggestOtherMode: true })
    expect(routeErrorView(err(503, 'STORE503-2'), 'CAR').message).not.toBe('서버 문구')
    expect(routeErrorView(err(404, 'STORE404-0'), 'CAR')).toMatchObject({ storeGone: true, canRetry: false })
    expect(routeErrorView(err(404, 'STORE404-1'), 'WALK').message).toContain('도보로 갈 수 있는')
    expect(routeErrorView(err(404, 'STORE404-1'), 'TRANSIT').message).toContain('대중교통으로 갈 수 있는')
    expect(routeErrorView(err(404, 'STORE404-1'), 'CAR').message).toContain('자동차로 갈 수 있는')
    expect(routeErrorView(err(400, 'STORE400-5'), 'CAR')).toMatchObject({ canRetry: false, suggestOtherMode: true })
    expect(routeErrorView(err(400, 'COMMON400-1'), 'CAR')).toMatchObject({ canRetry: false, suggestOtherMode: false })
    expect(routeErrorView(new TypeError('Failed to fetch'), 'CAR')).toMatchObject({ canRetry: true })
  })
})

describe('단계 구간 보기', () => {
  const step = (over: Partial<RouteStep>): RouteStep => ({
    type: 'BUS',
    guidance: null,
    distanceMeters: 1000,
    durationSeconds: 300,
    lineName: '472',
    path: [
      { latitude: 37.5, longitude: 127.0 },
      { latitude: 37.51, longitude: 127.01 },
    ],
    ...over,
  })

  it('안내 문구 끝 괄호에서 타는 곳·내리는 곳을 꺼낸다', () => {
    expect(stopNames(step({ guidance: '간선 472외 1대 (순천향대학병원.한남오거리 > 신사중학교)' }))).toEqual({
      from: '순천향대학병원.한남오거리',
      to: '신사중학교',
    })
  })

  it('형식이 다르면 이름 없이 둔다', () => {
    expect(stopNames(step({ guidance: '472번 버스 탑승' }))).toBeNull()
    expect(stopNames(step({ guidance: null }))).toBeNull()
  })

  it('자동차를 뺀 단계 중 좌표가 두 개 이상인 것만 누를 수 있다', () => {
    expect(isFocusable(step({}))).toBe(true)
    expect(isFocusable(step({ type: 'SUBWAY' }))).toBe(true)
    expect(isFocusable(step({ type: 'WALK' }))).toBe(true)
    expect(isFocusable(step({ type: 'BICYCLE' }))).toBe(true)
    expect(isFocusable(step({ type: 'DRIVE' }))).toBe(false)
    expect(isFocusable(step({ path: [{ latitude: 37.5, longitude: 127.0 }] }))).toBe(false)
  })

  it('버스·지하철은 승차·하차, 도보·자전거는 출발·도착으로 표시한다', () => {
    expect(endLabels(step({}))).toEqual({ start: '승차', end: '하차' })
    expect(endLabels(step({ type: 'WALK' }))).toEqual({ start: '출발', end: '도착' })
  })

  it('노선 요약은 도보를 빼고 탑승 순서를 유지하며, 같은 노선 재탑승도 생략하지 않는다', () => {
    expect(routeLinesText([
      step({ type: 'WALK', lineName: null }),
      step({ lineName: '145' }),
      step({ type: 'SUBWAY', lineName: '경의중앙선' }),
      step({ type: 'WALK', lineName: null }),
      step({ lineName: '145' }),
    ])).toBe('버스 145 → 지하철 경의중앙선 → 버스 145')
    expect(routeLinesText([step({ type: 'WALK', lineName: null })])).toBeNull()
    expect(routeLinesText([step({ lineName: null })])).toBe('버스')
  })

  it('연속 도보만 묶고 환승 경계를 넘지 않으며 원본 좌표와 단계 번호를 보존한다', () => {
    const steps = [step({type:'WALK'}), step({type:'WALK'}), step({}), step({type:'WALK'}), step({type:'SUBWAY'})]
    const groups = groupTransitSteps(steps)
    expect(groups.map((group) => group.indices)).toEqual([[0,1],[2],[3],[4]])
    expect(groups[0].steps[0]).toBe(steps[0])
    expect(groups[0].steps[1]).toBe(steps[1])
    expect(steps).toHaveLength(5)
  })

  it('도보 보강 false라도 출발지 30m 이내면 누락으로 단정하지 않으며 구버전에는 안내하지 않는다', () => {
    const route = {mode:'TRANSIT' as const, distanceMeters:1000,durationSeconds:300,fare:1500,transfers:0,originWalkIncluded:false,steps:[step({})]}
    expect(needsOriginWalkCheck(route,{lat:37.5,lng:127})).toBe(false)
    expect(needsOriginWalkCheck(route,{lat:37.6,lng:127})).toBe(true)
    expect(needsOriginWalkCheck({...route,originWalkIncluded:true},{lat:37.6,lng:127})).toBe(false)
    expect(needsOriginWalkCheck({...route,originWalkIncluded:undefined},{lat:37.6,lng:127})).toBe(false)
    expect(needsOriginWalkCheck({...route,steps:[step({path:[]})]},{lat:37.5,lng:127})).toBe(true)
  })
})
