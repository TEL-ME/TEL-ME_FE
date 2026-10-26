import { describe, expect, it } from 'vitest'
import { handOffQuestion, placeStoreQuestion, regionStoreQuestion, takeHandedQuestion } from './askHandoff'

describe('askHandoff', () => {
  it('넘긴 질문은 그 대화 화면에서 한 번만 꺼낼 수 있다', () => {
    handOffQuestion('/chat/12', regionStoreQuestion('서울 강남구'))

    expect(takeHandedQuestion('/chat/99')).toBeNull()
    expect(takeHandedQuestion('/chat/12')).toBe('서울 강남구 매장 찾아줘')
    expect(takeHandedQuestion('/chat/12')).toBeNull()
  })

  it('장소 이름은 근처 매장을 묻는 말로 만든다', () => {
    expect(placeStoreQuestion('강남역')).toBe('강남역 근처 매장 찾아줘')
  })
})
