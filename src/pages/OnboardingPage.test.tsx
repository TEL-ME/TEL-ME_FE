import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Me } from '../api/types'
import { meKey } from '../features/auth/useAuth'

const GUEST: Me = { authenticated: false, userId: null, email: null, name: null, role: 'GUEST', loginMethods: [] }
const USER: Me = { authenticated: true, userId: 1, email: 'a@b.c', name: '홍길동', role: 'USER', loginMethods: ['EMAIL'] }

const me = vi.fn<() => Promise<Me>>()
vi.mock('../api/auth', () => ({ authApi: { me: () => me() } }))

const { default: OnboardingPage } = await import('./OnboardingPage')

/** 이 탭이 예전에 받아 둔 로그인 상태(cached)를 가진 채로 시작하기를 연다 */
function show(cached: Me) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  client.setQueryData(meKey, cached)
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <OnboardingPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  fireEvent.click(screen.getByRole('button', { name: '건너뛰기' }))
}

beforeEach(() => me.mockReset())

describe('OnboardingPage 로그인 상태', () => {
  it('게스트로 기억하던 탭이라도 다른 탭에서 로그인했으면 이미 로그인된 화면을 보여 준다', async () => {
    me.mockResolvedValue(USER)
    show(GUEST)

    expect(await screen.findByText(/이미 로그인돼 있어요/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '게스트로 시작하기' })).not.toBeInTheDocument()
  })

  it('서버 확인이 끝나기 전에는 로그인·게스트 버튼을 보여 주지 않는다', () => {
    me.mockReturnValue(new Promise(() => {}))
    show(GUEST)

    expect(screen.getByLabelText('로그인 상태 확인 중')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '게스트로 시작하기' })).not.toBeInTheDocument()
  })

  it('정말 게스트면 로그인과 게스트 버튼을 보여 준다', async () => {
    me.mockResolvedValue(GUEST)
    show(GUEST)

    expect(await screen.findByRole('button', { name: '게스트로 시작하기' })).toBeInTheDocument()
  })
})
