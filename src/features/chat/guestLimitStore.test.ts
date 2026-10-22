import { beforeEach, describe, expect, it } from 'vitest'
import {
  applyGuestRemaining,
  applyGuestStatus,
  liftGuestLimit,
  markGuestLimited,
  nextKoreanMidnight,
  useGuestLimit,
} from './guestLimitStore'

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
    expect(useGuestLimit.getState()).toMatchObject({ limitedUntil: null, remaining: null, resetsAt: null })
  })

  it('서버가 0이라고 하면 resetsAt까지 잠근다', () => {
    applyGuestStatus({ limited: true, dailyLimit: 10, remaining: 0, resetsAt: '2099-01-01T15:00:00Z' })
    expect(useGuestLimit.getState()).toMatchObject({ remaining: 0, limitedUntil: Date.parse('2099-01-01T15:00:00Z') })
  })

  it('서버 값이 우선: 저장된 잠금이 있어도 남은 수가 있으면 푼다', () => {
    markGuestLimited()
    applyGuestStatus({ limited: true, dailyLimit: 10, remaining: 3, resetsAt: '2099-01-01T15:00:00Z' })
    expect(useGuestLimit.getState()).toMatchObject({ remaining: 3, limitedUntil: null })
  })

  it('회원·제한 꺼짐이면 아무것도 표시하지 않는다', () => {
    markGuestLimited()
    applyGuestStatus({ limited: false, dailyLimit: null, remaining: null, resetsAt: null })
    expect(useGuestLimit.getState()).toMatchObject({ remaining: null, limitedUntil: null })
  })

  it('전송 응답의 남은 수: 0이면 잠그고, 없으면(회원) 그대로 둔다', () => {
    applyGuestRemaining(undefined)
    expect(useGuestLimit.getState().remaining).toBeNull()
    applyGuestRemaining(0)
    expect(useGuestLimit.getState().limitedUntil).toBeGreaterThan(Date.now())
  })
})
