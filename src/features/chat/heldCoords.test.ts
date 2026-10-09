import { beforeEach, describe, expect, it } from 'vitest'
import type { ChatMessage } from '../../api/types'
import { coordsForNext, forgetCoords, rememberCoords } from './heldCoords'

type Msg = Pick<ChatMessage, 'role' | 'messageType' | 'sequenceNo'>
const here = { latitude: 37.5, longitude: 127.0 }
const located: Msg[] = [
  { role: 'USER', messageType: 'QUESTION', sequenceNo: 1 },
  { role: 'ASSISTANT', messageType: 'CLARIFICATION', sequenceNo: 2 },
  { role: 'USER', messageType: 'QUESTION', sequenceNo: 3 },
  { role: 'ASSISTANT', messageType: 'CLARIFICATION', sequenceNo: 4 },
]

describe('heldCoords', () => {
  beforeEach(forgetCoords)

  it('위치를 보낸 뒤 업무 되묻기에 답할 때 좌표를 다시 붙인다', () => {
    rememberCoords(1, here)
    expect(coordsForNext(1, located)).toEqual(here)
    // 되묻기가 이어지면 계속 붙는다
    expect(coordsForNext(1, located)).toEqual(here)
  })

  it('마지막 답변이 되묻기가 아니면 붙이지 않고 버린다', () => {
    rememberCoords(1, here)
    const answered: Msg[] = [...located, { role: 'USER', messageType: 'QUESTION', sequenceNo: 5 }, { role: 'ASSISTANT', messageType: 'STORE_RESULT', sequenceNo: 6 }]
    expect(coordsForNext(1, answered)).toBeUndefined()
    expect(coordsForNext(1, located)).toBeUndefined()
  })

  it('입력 검사로 막힌 내 메시지는 건너뛰고 마지막 답변을 본다', () => {
    rememberCoords(1, here)
    const blocked: Msg[] = [...located, { role: 'USER', messageType: 'BLOCKED', sequenceNo: 5 }]
    expect(coordsForNext(1, blocked)).toEqual(here)
  })

  it('다른 대화에는 붙이지 않는다', () => {
    rememberCoords(1, here)
    expect(coordsForNext(2, located)).toBeUndefined()
    expect(coordsForNext(1, located)).toBeUndefined()
  })

  it('들고 있는 좌표가 없으면 아무것도 붙이지 않는다', () => {
    expect(coordsForNext(1, located)).toBeUndefined()
  })
})
