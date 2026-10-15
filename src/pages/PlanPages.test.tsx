import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Plan, Subscription, SubscriptionMe, TerminationPenalty } from '../api/plans'
import { ApiError } from '../api/client'

const meState = { isUser: true }
vi.mock('../features/auth/useAuth', () => ({
  useMe: () => ({ me: { userId: meState.isUser ? 7 : null }, isUser: meState.isUser, isLoading: false }),
}))
const openLoginSheet = vi.fn()
vi.mock('../features/auth/loginSheetStore', () => ({ openLoginSheet: (o: unknown) => openLoginSheet(o) }))

const api = {
  me: vi.fn<() => Promise<SubscriptionMe>>(),
  list: vi.fn<() => Promise<Plan[]>>(),
  subscribe: vi.fn(),
  changePlan: vi.fn(),
  penalty: vi.fn<() => Promise<TerminationPenalty>>(),
  cancel: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
}
vi.mock('../api/plans', () => ({
  planApi: { list: () => api.list() },
  subscriptionApi: {
    me: () => api.me(),
    subscribe: (b: unknown) => api.subscribe(b),
    changePlan: (b: unknown) => api.changePlan(b),
    penalty: () => api.penalty(),
    cancel: () => api.cancel(),
    pause: (d: number) => api.pause(d),
    resume: () => api.resume(),
  },
  usageApi: { me: vi.fn() },
}))

const { default: PlanSelectPage } = await import('./PlanSelectPage')
const { default: MyPlanPage } = await import('./MyPlanPage')

const plan = (planId: number, patch: Partial<Plan> = {}): Plan => ({
  planId, code: `P${planId}`, name: `요금제 ${planId}`, networkType: 'FIVE_G', targetGroup: 'GENERAL', monthlyFee: 40_000,
  dataGb: 10, unlimited: false, voiceMinutes: null, voiceUnlimited: true, smsCount: null, smsUnlimited: true, ...patch,
})

const subscription = (patch: Partial<Subscription> = {}): Subscription => ({
  subscriptionId: 1, subscribedAt: '2026-01-05T00:00:00Z', currentPlan: plan(1), contract: null,
  pendingActivation: null, pendingChange: null, pause: null, ...patch,
})

const show = (path: string, ui: ReactNode) =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path={path} element={ui} />
          <Route path="/my/plan" element={<p>내 요금제 화면</p>} />
          <Route path="/my/plan/select" element={<p>가입 화면</p>} />
          <Route path="/my" element={<p>마이 화면</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )

beforeEach(() => {
  meState.isUser = true
  Object.values(api).forEach((f) => f.mockReset())
  openLoginSheet.mockReset()
  api.list.mockResolvedValue([plan(1), plan(2, { name: '청소년 요금제', targetGroup: 'YOUTH', monthlyFee: 33_000 })])
})

describe('요금제 가입', () => {
  it('게스트면 로그인 시트를 띄우고 안내를 남긴다', async () => {
    meState.isUser = false
    show('/my/plan/select', <PlanSelectPage />)
    expect(await screen.findByText('로그인이 필요해요')).toBeInTheDocument()
    expect(openLoginSheet).toHaveBeenCalledTimes(1)
    expect(api.me).not.toHaveBeenCalled()
  })

  it('약정을 고르면 월 할인액을 보여 주고, 청소년 요금제에서만 생년월일을 받는다', async () => {
    api.me.mockResolvedValue({ subscribed: false, subscription: null })
    api.subscribe.mockResolvedValue(subscription())
    show('/my/plan/select', <PlanSelectPage />)

    fireEvent.click(await screen.findByRole('radio', { name: /요금제 1/ }))
    expect(screen.queryByLabelText('생년월일')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('checkbox', { name: /약정으로 가입/ }))
    expect(screen.getByText('10,000원')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('radio', { name: /청소년 요금제/ }))
    fireEvent.change(screen.getByLabelText('생년월일'), { target: { value: '2010-03-02' } })
    fireEvent.click(screen.getByRole('button', { name: '가입하기' }))
    expect(await screen.findByText('내 요금제 화면')).toBeInTheDocument()
    expect(api.subscribe).toHaveBeenCalledWith({ planId: 2, birthDate: '2010-03-02', contract: true })
  })

  it('실패하면 서버 message를 그대로 보여 준다', async () => {
    api.me.mockResolvedValue({ subscribed: false, subscription: null })
    api.subscribe.mockRejectedValue(new ApiError(400, 'SUBSCRIPTION400-2', '가입 대상 연령이 아닙니다.'))
    show('/my/plan/select', <PlanSelectPage />)
    fireEvent.click(await screen.findByRole('radio', { name: /청소년 요금제/ }))
    fireEvent.click(screen.getByRole('button', { name: '가입하기' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('가입 대상 연령이 아닙니다.')
  })

  it('가입 중이면 변경 화면: 약정 선택이 없고 지금 요금제는 고를 수 없다', async () => {
    api.me.mockResolvedValue({ subscribed: true, subscription: subscription() })
    api.changePlan.mockResolvedValue(subscription({ pendingChange: { plan: plan(2), effectiveFrom: '2026-11-01T00:00:00Z' } }))
    show('/my/plan/select', <PlanSelectPage />)
    expect(await screen.findByRole('radio', { name: /요금제 1/ })).toBeDisabled()
    fireEvent.click(screen.getByRole('radio', { name: /청소년 요금제/ }))
    expect(screen.queryByRole('checkbox', { name: /약정/ })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '이 요금제로 변경' }))
    expect(await screen.findByText('내 요금제 화면')).toBeInTheDocument()
    expect(api.changePlan).toHaveBeenCalledWith({ planId: 2, birthDate: undefined })
  })
})

describe('내 요금제', () => {
  it('미가입이면 가입 화면으로 보낸다', async () => {
    api.me.mockResolvedValue({ subscribed: false, subscription: null })
    show('/my/plan', <MyPlanPage />)
    expect(await screen.findByText('가입 화면')).toBeInTheDocument()
  })

  it('약정이 끝났으면 할인 대신 "약정 만료", 정지 중이면 종료 예정과 기본료를 보여 준다', async () => {
    api.me.mockResolvedValue({
      subscribed: true,
      subscription: subscription({
        contract: { months: 24, discountPercent: 25, monthlyDiscount: 0, active: false, endsAt: '2026-01-05T00:00:00Z' },
        pause: { startedAt: '2026-10-10T00:00:00Z', endsAt: '2026-10-20T00:00:00Z', reducedMonthlyFee: 20_000 },
      }),
    })
    show('/my/plan', <MyPlanPage />)
    expect(await screen.findByText('약정 만료')).toBeInTheDocument()
    expect(screen.queryByText(/할인$/)).not.toBeInTheDocument()
    expect(screen.getByText('정지 중')).toBeInTheDocument()
    expect(screen.getByText(/정지 기간 기본료 월 20,000원/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '정지 해제' })).toBeInTheDocument()
  })

  it('해지 전에 예상 위약금을 보여 주고 확인받는다', async () => {
    api.me.mockResolvedValue({
      subscribed: true,
      subscription: subscription({ contract: { months: 24, discountPercent: 25, monthlyDiscount: 10_000, active: true, endsAt: '2027-01-05T00:00:00Z' } }),
    })
    api.penalty.mockResolvedValue({ hasContract: true, contractMonths: 24, elapsedMonths: 9, receivedDiscount: 90_000, refundPercent: 100, penalty: 90_000 })
    api.cancel.mockResolvedValue({ hasContract: true, contractMonths: 24, elapsedMonths: 9, receivedDiscount: 90_000, refundPercent: 100, penalty: 90_000 })
    show('/my/plan', <MyPlanPage />)
    expect(await screen.findByText(/매달/)).toHaveTextContent('매달 10,000원 할인')

    fireEvent.click(screen.getByRole('button', { name: '요금제 해지' }))
    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveTextContent('예상 위약금90,000원')
    expect(dialog).toHaveTextContent('약정 24개월 중 9개월 이용')
    expect(api.cancel).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: '해지' }))
    expect(await screen.findByText('마이 화면')).toBeInTheDocument()
    expect(api.cancel).toHaveBeenCalledTimes(1)
  })

  it('약정이 없으면 위약금 0원', async () => {
    api.me.mockResolvedValue({ subscribed: true, subscription: subscription() })
    api.penalty.mockResolvedValue({ hasContract: false, contractMonths: null, elapsedMonths: 0, receivedDiscount: 0, refundPercent: 0, penalty: 0 })
    show('/my/plan', <MyPlanPage />)
    fireEvent.click(await screen.findByRole('button', { name: '요금제 해지' }))
    expect(await screen.findByRole('dialog')).toHaveTextContent('예상 위약금0원')
  })
})
