import { describe, expect, it } from 'vitest'
import { hasChoices, isLocationAsk, wantsNearbyStore } from './storeAsk'

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

describe('wantsNearbyStore', () => {
  it.each([
    '현재 위치 근처 매장 알려줘',
    '현재위치에서 가까운 매장',
    '내 위치 기준 대리점 찾아줘',
    '근처 매장 알려줘',
    '주변에 유심 재발급 되는 매장 있어?',
    '내 주변 매장',
    '지금 근처 대리점 어디야',
  ])('"%s" → 좌표를 붙인다', (text) => {
    expect(wantsNearbyStore(text)).toBe(true)
  })

  it.each([
    '강남역 근처 매장 알려줘',
    '마포구 주변 대리점',
    '강남역근처 매장',
    '근처에서 데이터가 안 터져요',
    '가까운 매장 알아보기',
    '요금제 추천해줘',
  ])('"%s" → 붙이지 않는다', (text) => {
    expect(wantsNearbyStore(text)).toBe(false)
  })
})
