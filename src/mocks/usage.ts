import { http, HttpResponse } from 'msw'
import type { MonthUsage, ResourceUsage, UsageOverview } from '../api/plans'

/**
 * 사용량 화면 확인용 더미 (GET /api/v1/usage/me).
 * 실제 서버는 가입한 달부터만 데이터가 있어 지난 달을 볼 수 없으므로, 최근 6개월치를 만들어 돌려준다.
 * .env.local에 VITE_MOCK_USAGE=true를 넣었을 때만 켜진다 (VITE_ENABLE_MSW가 false면 꺼진다)
 */

const MONTHS = 6
const GB = 1024

const pad = (n: number) => String(n).padStart(2, '0')
const keyOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
const firstDay = (key: string) => `${key}-01`

function resource(used: number, limit: number | null): ResourceUsage {
  if (limit == null) return { used, limit: null, remaining: null, percent: null, unlimited: true, exceeded: false }
  return { used, limit, remaining: Math.max(0, limit - used), percent: Math.round((used * 100) / limit), unlimited: false, exceeded: used > limit }
}

/** 이번 달에서 몇 달 전인지에 따라 정한 사용량 (데이터 10GB · 통화 300분 · 문자 무제한 요금제 기준) */
const SAMPLES: { dataMb: number; voice: number; sms: number }[] = [
  { dataMb: 6.3 * GB, voice: 142, sms: 18 }, // 이번 달 (진행 중)
  { dataMb: 12.4 * GB, voice: 268, sms: 35 }, // 1달 전: 데이터 초과
  { dataMb: 8.1 * GB, voice: 331, sms: 22 }, // 2달 전: 통화 초과
  { dataMb: 4.6 * GB, voice: 120, sms: 9 },
  { dataMb: 9.7 * GB, voice: 205, sms: 41 },
  { dataMb: 0.8 * GB, voice: 15, sms: 2 }, // 개통한 달: 개통 이후만
]

function overview(monthParam: string | null): UsageOverview | null {
  const now = new Date()
  const months = Array.from({ length: MONTHS }, (_, i) => keyOf(new Date(now.getFullYear(), now.getMonth() - i, 1)))
  const key = monthParam ?? months[0]
  const ago = months.indexOf(key)
  if (ago < 0) return null
  const s = SAMPLES[ago]
  const current = ago === 0
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const usage: MonthUsage = {
    month: firstDay(key),
    daysUntilBilling: current ? lastDay - now.getDate() : null,
    paused: current ? false : null,
    data: resource(Math.round(s.dataMb), 10 * GB),
    voice: resource(s.voice, 300),
    sms: resource(s.sms, null),
    expectedFee: current ? { amount: 48_750, previousAmount: 52_300, difference: -3_550 } : null,
  }
  return {
    status: 'ACTIVE',
    activatesAt: null,
    availableFrom: firstDay(months[MONTHS - 1]),
    availableTo: firstDay(months[0]),
    usage,
  }
}

export const usageHandlers = [
  http.get('*/api/v1/usage/me', ({ request }) => {
    const month = new URL(request.url).searchParams.get('month')
    const result = overview(month)
    if (!result) {
      return HttpResponse.json(
        { isSuccess: false, code: 'USAGE400-0', message: '조회할 수 없는 달입니다. 개통 이후 최근 6개월까지 조회할 수 있습니다.', result: null },
        { status: 400 },
      )
    }
    return HttpResponse.json({ isSuccess: true, code: '200', message: 'OK', result })
  }),
]
