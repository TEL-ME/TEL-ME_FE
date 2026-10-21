import { beforeEach, describe, expect, it } from 'vitest'
import { liftGuestLimit, markGuestLimited, nextKoreanMidnight, useGuestLimit } from './guestLimitStore'

describe('게스트 하루 질문 수 한도', () => {
  beforeEach(() => liftGuestLimit())

  it('한국 시간 날짜로 다음 0시를 구한다 (서버가 한국 시간 날짜로 센다)', () => {
    // 한국 시간 10월 21일 23:59 → 10월 22일 0시 (UTC 10월 21일 15:00)
    expect(nextKoreanMidnight(Date.parse('2026-10-21T14:59:00Z'))).toBe(Date.parse('2026-10-21T15:00:00Z'))
    // 한국 시간 10월 22일 0:00 정각이면 그다음 날 0시
    expect(nextKoreanMidnight(Date.parse('2026-10-21T15:00:00Z'))).toBe(Date.parse('2026-10-22T15:00:00Z'))
    // UTC로는 아직 전날이어도 한국 시간 기준으로 센다 (한국 시간 10월 22일 08:00)
    expect(nextKoreanMidnight(Date.parse('2026-10-21T23:00:00Z'))).toBe(Date.parse('2026-10-22T15:00:00Z'))
  })

  it('걸리면 다음 0시까지 기억하고, 계정이 바뀌면 푼다', () => {
    markGuestLimited()
    expect(useGuestLimit.getState().limitedUntil).toBe(nextKoreanMidnight(Date.now()))
    liftGuestLimit()
    expect(useGuestLimit.getState().limitedUntil).toBeNull()
  })
})
