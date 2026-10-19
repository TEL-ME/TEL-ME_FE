import { describe, expect, it } from 'vitest'
import { planTaskPath } from './planTaskLinks'

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
