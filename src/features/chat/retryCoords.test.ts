import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearRetryCoords, RETRY_COORDS_TTL_MS, retryCoordsFor, saveRetryCoords } from './retryCoords'

const here = { latitude: 37.5, longitude: 127.0 }

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

  it('30분이 지나면 쓰지 않고 지운다', () => {
    vi.useFakeTimers()
    saveRetryCoords(1, 10, here)
    vi.advanceTimersByTime(RETRY_COORDS_TTL_MS + 1)
    expect(retryCoordsFor(1, 10)).toBeUndefined()
    expect(sessionStorage.getItem('telme.retryCoords')).toBeNull()
  })

  it('실행을 지정해 지우면 그 실행의 좌표일 때만 지운다', () => {
    saveRetryCoords(1, 10, here)
    clearRetryCoords(1, 11)
    expect(retryCoordsFor(1, 10)).toEqual(here)
    clearRetryCoords(1, 10)
    expect(retryCoordsFor(1, 10)).toBeUndefined()
  })
})
