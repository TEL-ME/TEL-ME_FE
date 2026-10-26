import { describe, expect, it } from 'vitest'
import type { MonthUsage, Plan, ResourceUsage } from '../../api/plans'
import { barPercent, contractDiscount, exceededItems, exceededWarning, formatData, monthLabel, overAmount, planAllowance, shiftMonth, toMonthKey } from './format'

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

describe('바꿀 요금제 한도 초과 (TELME-202)', () => {
  const used = (n: number): ResourceUsage => ({ used: n, limit: null, remaining: null, percent: null, unlimited: true, exceeded: false })
  const usage = (dataMb: number, voice: number, sms: number): MonthUsage => ({
    month: '2026-10-01', daysUntilBilling: 10, paused: false,
    data: used(dataMb), voice: used(voice), sms: used(sms), expectedFee: null,
  })

  it('데이터는 GB를 MB(×1024)로 바꿔 비교하고, 같으면 초과가 아니다', () => {
    const p = plan({ dataGb: 50 })
    expect(exceededItems(usage(50 * 1024, 0, 0), p)).toEqual([])
    expect(exceededItems(usage(100 * 1024, 0, 0), p)).toEqual(['데이터 100GB(한도 50GB)'])
  })

  it('통화·문자도 한도를 넘으면 함께 알리고, 무제한 항목은 비교하지 않는다', () => {
    const limited = plan({ dataGb: 10, voiceUnlimited: false, voiceMinutes: 100, smsUnlimited: false, smsCount: 50 })
    expect(exceededItems(usage(1024, 150, 51), limited)).toEqual(['통화 150분(한도 100분)', '문자 51건(한도 50건)'])
    expect(exceededItems(usage(999_999, 9_999, 9_999), plan({ unlimited: true, dataGb: null }))).toEqual([])
  })

  it('경고 문구는 채팅 변경 안내와 같고, 초과가 없으면 null', () => {
    expect(exceededWarning(usage(100 * 1024, 0, 0), plan({ dataGb: 50 }))).toBe(
      '이번 달 사용량이 이 요금제 한도를 넘어요: 데이터 100GB(한도 50GB). 바꾸면 이번 달은 한도를 넘은 것으로 표시되고, 이미 쓴 사용량은 줄지 않아요. 추가 요금은 없어요.',
    )
    expect(exceededWarning(usage(1024, 0, 0), plan({ dataGb: 50 }))).toBeNull()
  })
})
