import { describe, expect, it } from 'vitest'
import { parsePlanTaskLink, planTaskHref, planTaskPath } from './planTaskLinks'

describe('planTaskPath', () => {
  it('요금제 업무 링크 문구를 처리 화면 경로로 바꾼다', () => {
    expect(planTaskPath('요금제 가입하러 가기')).toBe('/my/plan/select')
    expect(planTaskPath('요금제 변경하러 가기')).toBe('/my/plan/select')
    expect(planTaskPath('일시 정지하러 가기')).toBe('/my/plan')
    expect(planTaskPath(' 해지하러 가기 ')).toBe('/my/plan')
  })

  it('일반 추천 질문은 링크가 아니다', () => {
    expect(planTaskPath('요금제 변경은 어떻게 해요?')).toBeUndefined()
    expect(planTaskPath('요금제 종류 알려줘')).toBeUndefined()
  })
})

describe('요금제 이름이 붙은 링크 (TELME-191)', () => {
  const plans = [
    { planId: 3, name: '5G 스탠다드' },
    { planId: 4, name: 'LTE 플러스' },
  ]

  it('"{이름} 가입하러 가기"·"{이름} 변경하러 가기"를 요금제 고르기 링크로 읽는다', () => {
    expect(parsePlanTaskLink('5G 스탠다드 가입하러 가기')).toEqual({ path: '/my/plan/select', planName: '5G 스탠다드' })
    expect(parsePlanTaskLink('LTE 플러스 변경하러 가기')).toEqual({ path: '/my/plan/select', planName: 'LTE 플러스' })
  })

  it('기본 문구는 이름 없이 읽고, 링크가 아닌 문구는 undefined', () => {
    expect(parsePlanTaskLink('요금제 변경하러 가기')).toEqual({ path: '/my/plan/select' })
    expect(parsePlanTaskLink('해지하러 가기')).toEqual({ path: '/my/plan' })
    expect(parsePlanTaskLink('요금제 변경은 어떻게 해요?')).toBeUndefined()
    expect(parsePlanTaskLink('매장 방문하러 가기')).toBeUndefined()
  })

  it('이름으로 요금제를 찾으면 planId를 붙이고(띄어쓰기·대소문자 무시), 못 찾으면 고르기 화면만 연다', () => {
    expect(planTaskHref({ path: '/my/plan/select', planName: '5G 스탠다드' }, plans)).toBe('/my/plan/select?planId=3')
    expect(planTaskHref({ path: '/my/plan/select', planName: 'lte플러스' }, plans)).toBe('/my/plan/select?planId=4')
    expect(planTaskHref({ path: '/my/plan/select', planName: '없는 요금제' }, plans)).toBe('/my/plan/select')
    expect(planTaskHref({ path: '/my/plan' }, plans)).toBe('/my/plan')
  })
})
