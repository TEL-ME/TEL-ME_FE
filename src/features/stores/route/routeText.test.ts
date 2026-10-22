import { describe, expect, it } from 'vitest'
import { ApiError } from '../../../api/client'
import { routeErrorView } from './routeError'
import { durationText, fareText, isArrived, transfersText } from './routeText'

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
