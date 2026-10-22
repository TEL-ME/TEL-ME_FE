import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../features/stores/locate', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../features/stores/locate')>()),
  canLocate: () => true,
  locateMe: vi.fn(),
}))
vi.mock('../features/stores/kakao/searchPlace', () => ({ searchPoint: vi.fn() }))
// 검색창은 보이게 하고, 지도 SDK는 끝나지 않게 둔다 (지도 없이 목록만 확인)
vi.mock('../features/stores/kakao/loadKakao', () => ({ hasKakaoKey: true, loadKakao: () => new Promise(() => {}) }))

import { searchPoint } from '../features/stores/kakao/searchPlace'
import { LocateError, locateMe } from '../features/stores/locate'
import StoreRoutePage from './StoreRoutePage'

const STORE = {
  storeId: 101,
  name: '텔미 강남구1호점',
  address: '서울특별시 강남구 도산대로15길 49',
  phone: null,
  latitude: 37.52145,
  longitude: 127.023326,
  hours: [],
  services: [],
}

const TRANSIT = {
  mode: 'TRANSIT',
  distanceMeters: 5200,
  durationSeconds: 1500,
  fare: 1500,
  transfers: 1,
  steps: [
    { type: 'WALK', guidance: '역까지 걷기', distanceMeters: 300, durationSeconds: 240, lineName: null, path: [] },
    {
      type: 'SUBWAY',
      guidance: null,
      distanceMeters: 4900,
      durationSeconds: 1260,
      lineName: '2호선',
      path: [{ latitude: 37.5, longitude: 127.0 }],
    },
  ],
}

const ok = (result: unknown) => ({ isSuccess: true, code: '200', message: 'OK', result })
const fail = (code: string, message = '실패') => ({ isSuccess: false, code, message, result: null })
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

/** 길찾기 응답을 수단별로 정한다. 함수면 직접 응답을 만든다 */
let routeReply: (mode: string) => Promise<Response> | Response
const routeCalls: string[] = []

beforeEach(() => {
  routeCalls.length = 0
  routeReply = () => json(200, ok(TRANSIT))
  vi.mocked(locateMe).mockResolvedValue({ lat: 37.5, lng: 127.0 })
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input), 'http://localhost')
      if (url.pathname === '/api/v1/stores/101') return json(200, ok(STORE))
      if (url.pathname === '/api/v1/stores/101/route') {
        const mode = url.searchParams.get('mode') ?? ''
        routeCalls.push(mode)
        return routeReply(mode)
      }
      return json(404, fail('COMMON404'))
    }),
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/stores/101/route']}>
        <Routes>
          <Route path="/stores/:storeId/route" element={<StoreRoutePage />} />
          <Route path="/stores" element={<p>매장 목록</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('StoreRoutePage', () => {
  it('현재 위치를 출발지로 대중교통 한 번만 조회하고, 시간·요금·환승·단계를 보여 준다', async () => {
    renderPage()
    expect(await screen.findByText('25분')).toBeInTheDocument()
    expect(screen.getByText('· 1,500원')).toBeInTheDocument()
    expect(screen.getByText('· 환승 1회')).toBeInTheDocument()
    expect(screen.getByText('지하철 2호선')).toBeInTheDocument()
    expect(screen.getByText('역까지 걷기')).toBeInTheDocument()
    expect(routeCalls).toEqual(['TRANSIT'])
    const url = new URL(String(vi.mocked(fetch).mock.calls.find(([u]) => String(u).includes('/route'))![0]), 'http://localhost')
    expect(url.searchParams.get('originLatitude')).toBe('37.5')
    expect(url.searchParams.get('originLongitude')).toBe('127')
  })

  it('요금·환승이 null이면 무료나 환승 없음으로 보여 주지 않는다', async () => {
    routeReply = () => json(200, ok({ ...TRANSIT, mode: 'TRANSIT', fare: null, transfers: null }))
    renderPage()
    await screen.findByText('25분')
    expect(screen.queryByText(/원$/)).not.toBeInTheDocument()
    expect(screen.queryByText(/무료/)).not.toBeInTheDocument()
    expect(screen.queryByText(/환승/)).not.toBeInTheDocument()
  })

  it('거리·시간 0에 빈 단계면 오류가 아니라 도착 안내를 보여 준다', async () => {
    routeReply = () => json(200, ok({ mode: 'TRANSIT', distanceMeters: 0, durationSeconds: 0, fare: null, transfers: null, steps: [] }))
    renderPage()
    expect(await screen.findByText('이미 매장 근처에 있어요.')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('하루 예산 소진(STORE503-4)은 서버 문구와 카카오맵만 보여 주고 자동으로 다시 부르지 않는다', async () => {
    routeReply = () => json(503, fail('STORE503-4', '오늘 이 이동 수단의 길찾기 제공량을 모두 사용했습니다.'))
    renderPage()
    expect(await screen.findByText('오늘 이 이동 수단의 길찾기 제공량을 모두 사용했습니다.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /카카오맵에서 보기/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '다시 시도' })).not.toBeInTheDocument()
    expect(screen.getByText('위에서 다른 이동 수단을 고를 수 있어요.')).toBeInTheDocument()
    await new Promise((r) => setTimeout(r, 50))
    expect(routeCalls).toEqual(['TRANSIT'])
  })

  it('길찾기 꺼짐(STORE503-3)은 다른 수단을 권하지 않는다', async () => {
    routeReply = () => json(503, fail('STORE503-3', '길찾기를 잠시 이용할 수 없습니다.'))
    renderPage()
    expect(await screen.findByText('길찾기를 잠시 이용할 수 없습니다.')).toBeInTheDocument()
    expect(screen.queryByText('위에서 다른 이동 수단을 고를 수 있어요.')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '다시 시도' })).not.toBeInTheDocument()
  })

  it('연동 실패(STORE503-2)는 원인을 단정하지 않고, 다시 시도를 눌러야만 다시 부른다', async () => {
    routeReply = () => json(503, fail('STORE503-2', 'Kakao key error'))
    renderPage()
    expect(await screen.findByText('길찾기를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.')).toBeInTheDocument()
    expect(screen.queryByText('Kakao key error')).not.toBeInTheDocument()
    expect(routeCalls).toHaveLength(1)

    routeReply = () => json(200, ok(TRANSIT))
    await userEvent.click(screen.getByRole('button', { name: '다시 시도' }))
    expect(await screen.findByText('25분')).toBeInTheDocument()
    expect(routeCalls).toHaveLength(2)
  })

  it('경로 없음(STORE404-1)은 그 수단으로 못 간다고 안내한다', async () => {
    routeReply = () => json(404, fail('STORE404-1'))
    renderPage()
    expect(await screen.findByText('대중교통으로 갈 수 있는 경로를 찾지 못했어요. 다른 이동 수단을 골라 보세요.')).toBeInTheDocument()
  })

  it('매장 없음(STORE404-0)은 다른 매장 찾기로 보낸다', async () => {
    routeReply = () => json(404, fail('STORE404-0'))
    renderPage()
    await userEvent.click(await screen.findByRole('button', { name: '다른 매장 찾기' }))
    expect(await screen.findByText('매장 목록')).toBeInTheDocument()
  })

  it('수단을 빨리 바꾸면 늦게 온 이전 수단의 응답이 화면을 덮지 않는다', async () => {
    let releaseTransit: (r: Response) => void = () => {}
    routeReply = (mode) =>
      mode === 'TRANSIT'
        ? new Promise<Response>((resolve) => (releaseTransit = resolve))
        : json(200, ok({ mode: 'WALK', distanceMeters: 800, durationSeconds: 600, fare: null, transfers: null, steps: [] }))
    renderPage()
    await waitFor(() => expect(routeCalls).toEqual(['TRANSIT']))

    await userEvent.click(screen.getByRole('button', { name: /도보/ }))
    expect(await screen.findByText('10분')).toBeInTheDocument()

    await act(async () => releaseTransit(json(200, ok(TRANSIT))))
    expect(screen.getByText('10분')).toBeInTheDocument()
    expect(screen.queryByText('25분')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /도보/ })).toHaveAttribute('aria-pressed', 'true')
  })

  it('조회 중에 같은 수단을 연타해도 한 번만 부른다', async () => {
    let release: (r: Response) => void = () => {}
    routeReply = () => new Promise<Response>((resolve) => (release = resolve))
    renderPage()
    await waitFor(() => expect(routeCalls).toHaveLength(1))
    const transit = screen.getByRole('button', { name: /대중교통/ })
    await userEvent.click(transit)
    await userEvent.click(transit)
    expect(routeCalls).toHaveLength(1)
    await act(async () => release(json(200, ok(TRANSIT))))
    expect(await screen.findByText('25분')).toBeInTheDocument()
  })

  it('위치 권한을 거절하면 안내하고, 검색한 곳을 출발지로 조회한다', async () => {
    vi.mocked(locateMe).mockRejectedValue(new LocateError('denied'))
    vi.mocked(searchPoint).mockResolvedValue({ label: '강남역', center: { lat: 37.4979, lng: 127.0276 } })
    renderPage()
    expect(await screen.findByText('위치 권한이 꺼져 있어요. 출발지를 직접 검색해 주세요.')).toBeInTheDocument()
    expect(routeCalls).toHaveLength(0)

    await userEvent.type(screen.getByRole('textbox', { name: '출발지 검색' }), '강남역')
    await userEvent.click(screen.getByRole('button', { name: '검색' }))
    expect(await screen.findByText('25분')).toBeInTheDocument()
    expect(screen.getByText('강남역')).toBeInTheDocument()
    expect(routeCalls).toEqual(['TRANSIT'])
  })
})
