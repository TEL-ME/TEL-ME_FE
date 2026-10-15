import { describe, expect, it } from 'vitest'
import type { Plan } from '../../api/plans'
import { barPercent, contractDiscount, formatData, monthLabel, overAmount, planAllowance, shiftMonth, toMonthKey } from './format'

const plan = (patch: Partial<Plan> = {}): Plan => ({
  planId: 1, code: 'P1', name: '5G 슬림', networkType: 'FIVE_G', targetGroup: 'GENERAL', monthlyFee: 55_000,
  dataGb: 12, unlimited: false, voiceMinutes: null, voiceUnlimited: true, smsCount: null, smsUnlimited: true, ...patch,
})

describe('formatData', () => {
  it('1GB = 1024MB로 바꾸고, 1GB 미만은 MB로 보여 준다', () => {
    expect(formatData(512)).toBe('512MB')
    expect(formatData(1024)).toBe('1GB')
    expect(formatData(8602)).toBe('8.4GB')
    expect(formatData(30 * 1024)).toBe('30GB')
  })
})

describe('사용량 막대', () => {
  it('초과하면 막대는 100에서 멈추고 초과량을 따로 센다', () => {
    const over = { used: 1300, limit: 1024, remaining: 0, percent: 127, unlimited: false, exceeded: true }
    expect(barPercent(over)).toBe(100)
    expect(overAmount(over)).toBe(276)
    expect(barPercent({ used: 5, limit: null, remaining: null, percent: null, unlimited: true, exceeded: false })).toBe(0)
  })
})

describe('요금제 표시', () => {
  it('무제한이면 값 대신 "무제한"', () => {
    expect(planAllowance(plan())).toEqual({ data: '12GB', voice: '무제한', sms: '무제한' })
    expect(planAllowance(plan({ dataGb: null, unlimited: true, voiceMinutes: 300, voiceUnlimited: false, smsCount: 100, smsUnlimited: false }))).toEqual({
      data: '무제한', voice: '300분', sms: '100건',
    })
  })

  it('약정 할인은 월정액의 25%를 내림한다 (서버와 같은 계산)', () => {
    expect(contractDiscount(55_000)).toBe(13_750)
    expect(contractDiscount(33_333)).toBe(8_333)
  })
})

describe('월 이동', () => {
  it('해를 넘겨 옮긴다', () => {
    expect(shiftMonth('2026-01', -1)).toBe('2025-12')
    expect(shiftMonth('2026-12', 1)).toBe('2027-01')
    expect(toMonthKey('2026-09-01')).toBe('2026-09')
    expect(monthLabel('2026-09')).toBe('2026년 9월')
  })
})
