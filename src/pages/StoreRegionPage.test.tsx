import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { takeHandedQuestion } from '../features/chat/askHandoff'
import { resetStoreSearch, useStoreSearch } from '../features/stores/storeSearchStore'
import StoreRegionPage from './StoreRegionPage'

const store = (storeId: number, district: string, regionCode: string) => ({
  storeId,
  name: `텔미 ${district}${storeId}호점`,
  address: `서울특별시 ${district} 테헤란로 ${storeId}`,
  phone: null,
  regionCode,
  latitude: 37.5,
  longitude: 127.03,
  services: [],
})

const SEOUL = {
  stores: [store(1, '강남구', '1168010100'), store(2, '강남구', '1168010700'), store(3, '서초구', '1165010200')],
  page: 0,
  size: 50,
  totalElements: 3,
  totalPages: 1,
}

function renderAt(state: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify({ isSuccess: true, code: '200', message: 'OK', result: SEOUL }), { status: 200 })),
  )
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[{ pathname: '/stores/region', state }]}>
        <Routes>
          <Route path="/stores/region" element={<StoreRegionPage />} />
          <Route path="/stores" element={<p>매장 화면</p>} />
          <Route path="/chat/:sessionId" element={<p>상담 화면</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

async function pickGangnam() {
  fireEvent.click(screen.getByRole('button', { name: '서울' }))
  fireEvent.click(await screen.findByRole('button', { name: /강남구/ }))
}

afterEach(() => {
  vi.unstubAllGlobals()
  resetStoreSearch()
})

describe('StoreRegionPage', () => {
  it('상담에서 열면 고른 지역을 그 대화의 질문으로 넘기고 상담으로 돌아간다', async () => {
    renderAt({ askChat: '/chat/12' })
    await pickGangnam()
    fireEvent.click(screen.getByRole('button', { name: '서울 강남구 매장 물어보기' }))

    expect(await screen.findByText('상담 화면')).toBeInTheDocument()
    expect(takeHandedQuestion('/chat/12')).toBe('서울 강남구 매장 찾아줘')
    // 매장 화면의 검색 기준은 건드리지 않는다
    expect(useStoreSearch.getState().origin).toMatchObject({ kind: 'region', auto: true })
  })

  it('지역을 되묻는 말에 답할 때는 지역 이름만 넘긴다', async () => {
    renderAt({ askChat: '/chat/12', asAnswer: true })
    await pickGangnam()
    fireEvent.click(screen.getByRole('button', { name: '서울 강남구 매장 찾기' }))

    expect(await screen.findByText('상담 화면')).toBeInTheDocument()
    expect(takeHandedQuestion('/chat/12')).toBe('서울 강남구')
  })

  it('그 밖에는 고른 지역의 매장을 매장 화면에 보여 준다', async () => {
    renderAt(null)
    await pickGangnam()
    fireEvent.click(screen.getByRole('button', { name: '서울 강남구 매장 보기' }))

    expect(await screen.findByText('매장 화면')).toBeInTheDocument()
    expect(useStoreSearch.getState().origin).toMatchObject({ kind: 'region', code: '11680', label: '서울 강남구' })
    expect(takeHandedQuestion('/chat/12')).toBeNull()
  })
})
