import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { MonthUsage, ResourceUsage, UsageOverview } from '../../../api/plans'

vi.mock('../../auth/useAuth', () => ({ useMe: () => ({ me: { userId: 7 }, isUser: true, isLoading: false }) }))
const usageMe = vi.fn<(month?: string) => Promise<UsageOverview>>()
vi.mock('../../../api/plans', () => ({ usageApi: { me: (month?: string) => usageMe(month) } }))

const { default: UsageSection } = await import('./UsageSection')

const res = (used: number, limit: number | null): ResourceUsage =>
  limit == null
    ? { used, limit: null, remaining: null, percent: null, unlimited: true, exceeded: false }
    : { used, limit, remaining: Math.max(0, limit - used), percent: Math.round((used * 100) / limit), unlimited: false, exceeded: used > limit }

const month = (key: string, current: boolean, patch: Partial<MonthUsage> = {}): MonthUsage => ({
  month: `${key}-01`,
  daysUntilBilling: current ? 12 : null,
  paused: current ? false : null,
  data: res(8602, 30 * 1024),
  voice: res(214, null),
  sms: res(40, 100),
  expectedFee: current ? { amount: 55_000, previousAmount: 58_000, difference: -3_000 } : null,
  ...patch,
})

const active = (usage: MonthUsage): UsageOverview => ({
  status: 'ACTIVE', activatesAt: null, availableFrom: '2026-08-01', availableTo: '2026-10-01', usage,
})

const show = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <UsageSection />
    </QueryClientProvider>,
  )

describe('UsageSection', () => {
  beforeEach(() => usageMe.mockReset())

  it('이번 달: 남은 양·무제한·정산일을 보여 주고, 다음 달 버튼은 막는다', async () => {
    usageMe.mockResolvedValue(active(month('2026-10', true)))
    show()
    expect(await screen.findByText('21.6GB 남음')).toBeInTheDocument()
    expect(screen.getByText('214분 사용')).toBeInTheDocument()
    expect(screen.getByText('60건 남음')).toBeInTheDocument()
    expect(screen.getByText('정산일까지 12일')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '다음 달' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '이전 달' })).toBeEnabled()
  })

  it('요금제를 바꿔 사용률이 100%를 크게 넘어도 막대는 100%에서 멈추고 초과로 보여 준다', async () => {
    usageMe.mockResolvedValue(active(month('2026-10', true, { data: res(25 * 1024, 8 * 1024) })))
    show()
    expect(await screen.findByText('17GB 초과')).toBeInTheDocument()
    expect(screen.getByText('313% 사용 · 25GB 씀')).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: '데이터 사용률' })).toHaveAttribute('aria-valuenow', '100')
  })

  it('한도를 넘으면 초과량과 "한도 초과"를 보여 준다', async () => {
    usageMe.mockResolvedValue(active(month('2026-10', true, { data: res(1300, 1024), paused: true })))
    show()
    expect(await screen.findByText('276MB 초과')).toBeInTheDocument()
    expect(screen.getByText('한도 초과')).toBeInTheDocument()
    expect(screen.getByText('127% 사용 · 1.3GB 씀')).toBeInTheDocument()
    expect(screen.getByText('일시 정지 중')).toBeInTheDocument()
  })

  it('◀로 지난 달을 조회하고, 범위의 첫 달에서는 ◀를 막는다', async () => {
    usageMe.mockImplementation(async (m) =>
      m == null ? active(month('2026-10', true)) : active(month(m, false, { data: res(2048, 30 * 1024) })),
    )
    show()
    await screen.findByText('21.6GB 남음')
    fireEvent.click(screen.getByRole('button', { name: '이전 달' }))
    expect(await screen.findByText('2026년 9월 사용량')).toBeInTheDocument()
    expect(usageMe).toHaveBeenLastCalledWith('2026-09')
    expect(screen.queryByText(/정산일까지/)).not.toBeInTheDocument()
    expect(screen.getByText('지난 달은 사용량만 보여요.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '이전 달' }))
    expect(await screen.findByText('2026년 8월 사용량')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '이전 달' })).toBeDisabled()

    // 끝까지 오면 다시 이번 달(월 생략)로 읽는다
    fireEvent.click(screen.getByRole('button', { name: '다음 달' }))
    await screen.findByText('2026년 9월 사용량')
    fireEvent.click(screen.getByRole('button', { name: '다음 달' }))
    expect(await screen.findByText('이번 달 사용량')).toBeInTheDocument()
    expect(usageMe).toHaveBeenLastCalledWith(undefined)
    within(screen.getByText('이번 달 사용량').closest('section')!).getByText('정산일까지 12일')
  })

  it('미가입·개통 전은 오류가 아니며 이 칸을 그리지 않는다', async () => {
    usageMe.mockResolvedValue({ status: 'NOT_SUBSCRIBED', activatesAt: null, availableFrom: null, availableTo: null, usage: null })
    const { container } = show()
    await vi.waitFor(() => expect(usageMe).toHaveBeenCalled())
    await vi.waitFor(() => expect(container).toBeEmptyDOMElement())
  })
})
