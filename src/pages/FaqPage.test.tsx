import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useGoneFaqs } from '../features/faq/goneFaqs'
import { useToastStore } from '../stores/toastStore'
import FaqPage from './FaqPage'

const ok = (result: unknown) => ({ isSuccess: true, code: '200', message: 'OK', result })
const PINNED = { faqId: 7, category: 'DEVICE', question: '휴대폰 분실 신고는 어떻게 하나요?', answer: '고객센터에서 신고할 수 있어요.' }
const OTHER = { faqId: 8, category: 'DEVICE', question: '기기 변경은 어디서 하나요?', answer: '매장에서 할 수 있어요.' }

function stubFetch(detail: { status: number; body: unknown }) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input)
    if (/\/api\/v1\/faqs\/\d+/.test(url)) {
      return new Response(JSON.stringify(detail.body), { status: detail.status, headers: { 'Content-Type': 'application/json' } })
    }
    const page = { faqs: [PINNED, OTHER], page: 0, size: 20, totalElements: 2, totalPages: 1 }
    return new Response(JSON.stringify(ok(page)), { status: 200, headers: { 'Content-Type': 'application/json' } })
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function renderAt(path: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/faq" element={<FaqPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
  useGoneFaqs.setState({ ids: [] })
})

describe('FaqPage', () => {
  it('?id=로 오면 그 FAQ를 맨 위에 펼치고 카테고리를 맞춘다', async () => {
    const fetchMock = stubFetch({ status: 200, body: ok(PINNED) })
    renderAt('/faq?id=7')

    expect(await screen.findByText('상담에서 참고한 정보')).toBeInTheDocument()
    expect(screen.getByText('고객센터에서 신고할 수 있어요.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '기기' })).toHaveAttribute('aria-pressed', 'true')
    // 목록에 같은 FAQ가 와도 한 번만 보인다
    await screen.findByText(OTHER.question)
    expect(screen.getAllByText(PINNED.question)).toHaveLength(1)
    // 목록은 그 FAQ의 카테고리로 한 번만 부른다
    const listCalls = fetchMock.mock.calls.map(([u]) => String(u)).filter((u) => u.includes('/api/v1/faqs?'))
    expect(listCalls).toHaveLength(1)
    expect(listCalls[0]).toContain('category=DEVICE')
  })

  it('삭제된 FAQ로 오면 알리고 전체 목록을 보여준다', async () => {
    stubFetch({ status: 404, body: { isSuccess: false, code: 'FAQ404-0', message: 'FAQ를 찾을 수 없습니다.', result: null } })
    renderAt('/faq?id=7')

    await waitFor(() => expect(useToastStore.getState().message).toBe('삭제된 질문이에요'))
    expect(useGoneFaqs.getState().ids).toContain(7)
    expect(await screen.findByText(OTHER.question)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '전체' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.queryByText('상담에서 참고한 정보')).not.toBeInTheDocument()
  })
})
