import { describe, expect, it } from 'vitest'
import { isLocationAsk } from './storeAsk'

describe('isLocationAsk', () => {
  it('매장을 찾을 지역을 되묻는 말을 알아본다', () => {
    expect(isLocationAsk({ messageType: 'CLARIFICATION', content: '어느 지역의 매장을 찾으시나요? 역 이름이나 동네를 알려주세요.' })).toBe(true)
  })

  it('다른 것을 되묻거나 되묻는 말이 아니면 아니다', () => {
    expect(isLocationAsk({ messageType: 'CLARIFICATION', content: '지금 쓰는 요금제 이름을 알려 주시겠어요?' })).toBe(false)
    expect(isLocationAsk({ messageType: 'ANSWER', content: '가까운 매장은 매장 탭에서 찾을 수 있어요.' })).toBe(false)
    expect(isLocationAsk(undefined)).toBe(false)
  })
})
