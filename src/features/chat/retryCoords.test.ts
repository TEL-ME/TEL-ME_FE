import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearAllRetryCoords, clearRetryCoords, retryCoordsFor, saveRetryCoords } from './retryCoords'

const here = { latitude: 37.5, longitude: 127.0 }
const there = { latitude: 35.1, longitude: 129.0 }

describe('retryCoords', () => {
  beforeEach(() => sessionStorage.clear())
  afterEach(() => vi.useRealTimers())

  it('같은 대화·실행이면 좌표를 돌려준다', () => {
    saveRetryCoords(1, 10, here)
    expect(retryCoordsFor(1, 10)).toEqual(here)
  })

  it('다른 대화나 다른 실행이면 돌려주지 않는다', () => {
    saveRetryCoords(1, 10, here)
    expect(retryCoordsFor(2, 10)).toBeUndefined()
    expect(retryCoordsFor(1, 11)).toBeUndefined()
  })

  it('여러 대화의 좌표를 따로 보관하고, 나중 것이 앞의 것을 덮지 않는다', () => {
    saveRetryCoords(1, 10, here)
    saveRetryCoords(2, 20, there)
    expect(retryCoordsFor(1, 10)).toEqual(here)
    expect(retryCoordsFor(2, 20)).toEqual(there)
  })

  it('실행 하나를 지우면 그 실행 것만 지운다', () => {
    saveRetryCoords(1, 10, here)
    saveRetryCoords(2, 20, there)
    clearRetryCoords(1, 10)
    expect(retryCoordsFor(1, 10)).toBeUndefined()
    expect(retryCoordsFor(2, 20)).toEqual(there)
  })

  it('시간이 오래 지나도 지우지 않는다 (서버의 재시도 가능 상태에 기한이 없다)', () => {
    vi.useFakeTimers()
    saveRetryCoords(1, 10, here)
    vi.advanceTimersByTime(24 * 60 * 60 * 1000)
    expect(retryCoordsFor(1, 10)).toEqual(here)
  })

  it('로그아웃 등으로 모두 지울 수 있다', () => {
    saveRetryCoords(1, 10, here)
    saveRetryCoords(2, 20, there)
    clearAllRetryCoords()
    expect(sessionStorage.getItem('telme.retryCoords')).toBeNull()
  })
})
