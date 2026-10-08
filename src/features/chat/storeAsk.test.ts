import { describe, expect, it } from 'vitest'
import { hasChoices, isLocationAsk } from './storeAsk'

describe('isLocationAsk', () => {
  it('매장을 찾을 지역을 되묻는 말을 알아본다', () => {
    expect(isLocationAsk({ messageType: 'CLARIFICATION', content: '어느 지역의 매장을 찾으시나요? 역 이름이나 동네를 알려주세요.' })).toBe(true)
  })

  it('다른 것을 되묻거나 되묻는 말이 아니면 아니다', () => {
    expect(isLocationAsk({ messageType: 'CLARIFICATION', content: '지금 쓰는 요금제 이름을 알려 주시겠어요?' })).toBe(false)
    expect(isLocationAsk({ messageType: 'ANSWER', content: '가까운 매장은 매장 탭에서 찾을 수 있어요.' })).toBe(false)
    expect(isLocationAsk(undefined)).toBe(false)
  })

  it('선택지가 있는 되묻기(업무 되묻기)는 지역 되묻기가 아니다', () => {
    const ask = {
      messageType: 'CLARIFICATION' as const,
      content: '어떤 업무로 매장을 찾으시나요?',
      followUps: ['유심 재발급', '번호이동', '신규 개통', '명의변경'],
    }
    expect(isLocationAsk(ask)).toBe(false)
    expect(hasChoices(ask)).toBe(true)
    expect(hasChoices({ ...ask, followUps: [] })).toBe(false)
  })
})
