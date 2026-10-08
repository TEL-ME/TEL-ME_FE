import { beforeEach, describe, expect, it } from 'vitest'
import type { InputGuardNotice } from '../../api/types'
import { applyInputGuard, clearInputGuardNotice, liftRestriction, useInputGuard } from './inputGuardStore'

const notice = (over: Partial<InputGuardNotice>): InputGuardNotice => ({
  action: 'WARNED',
  message: '욕설을 제외하고 질문해 주세요.',
  violationCount: 1,
  retryAfterSeconds: 0,
  restrictionStartedAt: null,
  restrictionUntil: null,
  detections: [],
  ...over,
})

describe('inputGuardStore', () => {
  beforeEach(() => liftRestriction())

  it('가림(MASKED)은 정상 접수라 입력창 안내를 띄우지 않는다', () => {
    applyInputGuard(notice({ action: 'MASKED' }))
    expect(useInputGuard.getState().notice).toBeNull()
  })

  it('경고는 안내만 띄우고 입력을 막지 않는다', () => {
    applyInputGuard(notice({ action: 'WARNED' }))
    expect(useInputGuard.getState().notice?.action).toBe('WARNED')
    expect(useInputGuard.getState().restrictedUntil).toBeNull()
    clearInputGuardNotice()
    expect(useInputGuard.getState().notice).toBeNull()
  })

  it('일시 제한은 restrictionUntil까지 막는다', () => {
    applyInputGuard(notice({ action: 'RESTRICTED', restrictionUntil: '2099-01-01T00:00:00Z' }))
    expect(useInputGuard.getState().restrictedUntil).toBe(Date.parse('2099-01-01T00:00:00Z'))
  })

  it('끝 시각이 없으면 retryAfterSeconds로 계산한다', () => {
    const before = Date.now()
    applyInputGuard(notice({ action: 'RESTRICTED', retryAfterSeconds: 60 }))
    expect(useInputGuard.getState().restrictedUntil).toBeGreaterThanOrEqual(before + 60_000)
  })
})
