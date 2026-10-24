import { describe, expect, it } from 'vitest'
import { answeredClarification } from './admin'

describe('answeredClarification', () => {
  it('원래 질문이 질문과 다를 때만 되묻기에 답한 것으로 본다', () => {
    expect(answeredClarification('근처 매장 알려줘', '강남역이요')).toBe(true)
    // 백엔드는 되묻기가 없으면 질문 자신을 원래 질문으로 내려준다
    expect(answeredClarification('유심 재발급 비용', '유심 재발급 비용')).toBe(false)
    expect(answeredClarification(' 유심 재발급 비용 ', '유심 재발급 비용')).toBe(false)
    expect(answeredClarification(null, '유심 재발급 비용')).toBe(false)
  })
})
