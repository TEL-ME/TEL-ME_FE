import { describe, expect, it } from 'vitest'
import {
  dayOfWeekOf,
  distanceMeters,
  districtName,
  formatDistance,
  formatRadius,
  hoursText,
  telHref,
  toRegionCode,
} from './format'

describe('formatDistance', () => {
  it('1km 미만은 m, 그 이상은 km로 보여 준다', () => {
    expect(formatDistance(4)).toBe('10m')
    expect(formatDistance(347)).toBe('350m')
    expect(formatDistance(994)).toBe('990m')
    expect(formatDistance(1000)).toBe('1.0km')
    expect(formatDistance(2360)).toBe('2.4km')
    expect(formatDistance(318_120)).toBe('318km')
  })
})

describe('formatRadius', () => {
  it('km로 떨어지면 소수점 없이 보여 준다', () => {
    expect(formatRadius(500)).toBe('500m')
    expect(formatRadius(3000)).toBe('3km')
    expect(formatRadius(2500)).toBe('2.5km')
    expect(formatRadius(10000)).toBe('10km')
  })
})

describe('distanceMeters', () => {
  it('서울시청에서 강남역까지 직선거리는 8.6km쯤이다', () => {
    const d = distanceMeters({ lat: 37.5665, lng: 126.978 }, { lat: 37.4979, lng: 127.0276 })
    expect(d).toBeGreaterThan(8_300)
    expect(d).toBeLessThan(8_900)
  })
})

describe('toRegionCode', () => {
  it('0으로 채운 뒷자리를 떼어 낸다', () => {
    expect(toRegionCode('1100000000')).toBe('11')
    expect(toRegionCode('4111000000')).toBe('4111')
    expect(toRegionCode('1121500000')).toBe('11215')
    // 다섯째 자리가 0이면 4자리로 줄인다 (수원시 4111처럼 구가 있는 시를 한 번에 찾으려는 백엔드 규칙). 강남구(11680)도 1168이 된다
    expect(toRegionCode('1168000000')).toBe('1168')
    expect(toRegionCode('1168010700')).toBe('11680107')
    expect(toRegionCode('4182025021')).toBe('4182025021')
  })

  it('형식이 다르면 null', () => {
    expect(toRegionCode('11680')).toBeNull()
    expect(toRegionCode(undefined)).toBeNull()
  })
})

describe('districtName', () => {
  it('주소에서 시·군·구 이름을 뽑는다', () => {
    expect(districtName('서울특별시 강남구 도산대로15길 49')).toBe('강남구')
    expect(districtName('경기도 수원시 영통구 광교로 1')).toBe('수원시 영통구')
    expect(districtName('경기도 의정부시 평화로 1')).toBe('의정부시')
    expect(districtName('세종특별자치시 한누리대로 2130')).toBeNull()
  })
})

describe('hoursText', () => {
  it('영업시간 · 휴무 · 정보 없음을 구분한다', () => {
    expect(hoursText({ dayOfWeek: 'MONDAY', openTime: '10:00:00', closeTime: '19:00:00', closed: false })).toBe('10:00 ~ 19:00')
    expect(hoursText({ dayOfWeek: 'SUNDAY', openTime: null, closeTime: null, closed: true })).toBe('휴무')
    expect(hoursText(undefined)).toBe('정보 없음')
  })
})

describe('dayOfWeekOf · telHref', () => {
  it('일요일은 SUNDAY, 월요일은 MONDAY', () => {
    expect(dayOfWeekOf(new Date(2026, 9, 4))).toBe('SUNDAY')
    expect(dayOfWeekOf(new Date(2026, 9, 5))).toBe('MONDAY')
  })

  it('전화번호의 기호를 뺀다', () => {
    expect(telHref('02-1234-5678')).toBe('tel:0212345678')
  })
})
