import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import StoreDetailPage from './StoreDetailPage'

const STORE = {
  storeId: 101,
  name: '텔미 강남구1호점',
  address: '서울특별시 강남구 도산대로15길 49',
  phone: null as string | null,
  latitude: 37.52145,
  longitude: 127.023326,
  hours: [
    { dayOfWeek: 'MONDAY', openTime: '10:00:00', closeTime: '19:00:00', closed: false },
    { dayOfWeek: 'SUNDAY', openTime: null, closeTime: null, closed: true },
  ],
  services: [{ code: 'USIM_REISSUE', name: '유심재발급' }],
}

function respond(status: number, body: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })),
  )
}

function renderAt(path: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/stores/:storeId" element={<StoreDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('StoreDetailPage', () => {
  it('영업시간을 요일별로 보여 주고, 등록 안 된 요일은 정보 없음으로 둔다', async () => {
    respond(200, { isSuccess: true, code: '200', message: 'OK', result: STORE })
    renderAt('/stores/101')

    expect(await screen.findByRole('heading', { name: '텔미 강남구1호점' })).toBeInTheDocument()
    expect(screen.getByText('10:00 ~ 19:00')).toBeInTheDocument()
    expect(screen.getByText('휴무')).toBeInTheDocument()
    expect(screen.getAllByText('정보 없음')).toHaveLength(5)
    expect(screen.getByText('유심재발급')).toBeInTheDocument()
  })

  it('전화번호가 없으면 전화하기를 숨기고, 있으면 보여 준다', async () => {
    respond(200, { isSuccess: true, code: '200', message: 'OK', result: STORE })
    renderAt('/stores/101')
    await screen.findByRole('link', { name: '길찾기' })
    expect(screen.queryByRole('link', { name: '전화하기' })).not.toBeInTheDocument()
  })

  it('전화번호가 있으면 전화하기 링크를 건다', async () => {
    respond(200, { isSuccess: true, code: '200', message: 'OK', result: { ...STORE, phone: '02-1234-5678' } })
    renderAt('/stores/101')
    expect(await screen.findByRole('link', { name: '전화하기' })).toHaveAttribute('href', 'tel:0212345678')
  })

  it('폐점했거나 없는 매장(404)은 안내 화면을 보여 준다', async () => {
    respond(404, { isSuccess: false, code: 'STORE404-0', message: '매장을 찾을 수 없습니다.', result: null })
    renderAt('/stores/157')
    expect(await screen.findByRole('heading', { name: '없는 매장이에요' })).toBeInTheDocument()
  })

  it('숫자가 아닌 주소는 서버에 묻지 않고 안내 화면을 보여 준다', () => {
    respond(200, {})
    renderAt('/stores/abc')
    expect(screen.getByRole('heading', { name: '없는 매장이에요' })).toBeInTheDocument()
    expect(fetch).not.toHaveBeenCalled()
  })
})
