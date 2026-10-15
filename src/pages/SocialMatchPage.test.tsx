import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useLoginSheet } from '../features/auth/loginSheetStore'
import SocialMatchPage from './SocialMatchPage'

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
const fail = (status: number, code: string) => json(status, { isSuccess: false, code, message: code, result: null })

function renderPage() {
  render(
    <MemoryRouter initialEntries={[{ pathname: '/auth/social-match', state: { provider: 'GOOGLE' } }]}>
      <Routes>
        <Route path="/auth/social-match" element={<SocialMatchPage />} />
        <Route path="*" element={<p>다른 화면</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => sessionStorage.clear())
afterEach(() => {
  vi.unstubAllGlobals()
  useLoginSheet.setState({ open: false, subtitle: null, error: null })
})

describe('SocialMatchPage', () => {
  it('비밀번호가 틀리면 입력칸 아래에 알린다', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => fail(401, 'MEMBER401-0')))
    renderPage()
    expect(screen.getByText(/Google 계정과 같은 이메일로 가입한/)).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText('기존 계정 비밀번호'), 'wrong')
    await userEvent.click(screen.getByRole('button', { name: '확인하고 연결하기' }))
    expect(await screen.findByText('비밀번호가 올바르지 않아요')).toBeInTheDocument()
  })

  it('10분이 지났으면(MEMBER400-0) 나가서 다시 로그인하게 한다', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => fail(400, 'MEMBER400-0')))
    renderPage()
    await userEvent.type(screen.getByLabelText('기존 계정 비밀번호'), 'pw')
    await userEvent.click(screen.getByRole('button', { name: '확인하고 연결하기' }))
    expect(await screen.findByText('다른 화면')).toBeInTheDocument()
    expect(useLoginSheet.getState().error).toContain('만료')
  })

  it('새 계정으로 시작은 확인을 한 번 더 받는다', async () => {
    const fetchMock = vi.fn(async (url: RequestInfo | URL) =>
      String(url).includes('/auth/me')
        ? json(200, { isSuccess: true, code: '200', message: 'OK', result: { authenticated: true, loginMethods: ['GOOGLE'] } })
        : json(200, { isSuccess: true, code: '200', message: 'OK', result: {} }),
    )
    vi.stubGlobal('fetch', fetchMock)
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: '새 계정으로 시작하기' }))
    expect(screen.getByText(/나중에 두 계정을 연결할 수도 없어요/)).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: '새 계정으로 시작' }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/social/start-new'), expect.anything()))
    expect(await screen.findByText('다른 화면')).toBeInTheDocument()
  })
})
