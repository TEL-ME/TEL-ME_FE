import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen, waitFor, within } from '@testing-library/react'
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
import RouteMap from '../features/stores/route/RouteMap'
import StoreRoutePage from './StoreRoutePage'

// 지도 실패·키 없음에도 목록은 사용할 수 있다. 지도에 전달되는 선택 경로는 별도로 확인한다
vi.mock('../features/stores/route/RouteMap', () => ({ default: vi.fn(() => null) }))

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

const ALTERNATIVE = {
  mode: 'TRANSIT',
  distanceMeters: 6300,
  durationSeconds: 1800,
  fare: 1750,
  transfers: 0,
  originWalkIncluded: false,
  alternatives: [],
  steps: [{
    type: 'BUS',
    guidance: '간선 148 (뚝섬서울숲 > 경동시장앞)',
    distanceMeters: 6300,
    durationSeconds: 1800,
    lineName: '148',
    path: [{ latitude: 37.54, longitude: 127.03 }, { latitude: 37.58, longitude: 127.04 }],
  }],
}

const MULTI_TRANSIT = { ...TRANSIT, originWalkIncluded: true, alternatives: [ALTERNATIVE] }

const walkNotice = '출발 도보를 불러오지 못했어요.'

function lastMapProps() {
  return vi.mocked(RouteMap).mock.calls.at(-1)![0]
}

const ok = (result: unknown) => ({ isSuccess: true, code: '200', message: 'OK', result })
const fail = (code: string, message = '실패') => ({ isSuccess: false, code, message, result: null })
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

/** 길찾기 응답을 수단별로 정한다. 함수면 직접 응답을 만든다 */
let routeReply: (mode: string) => Promise<Response> | Response
const routeCalls: string[] = []
const walkCalls: URL[] = []
let walkReply: () => Response | Promise<Response>

beforeEach(() => {
  routeCalls.length = 0
  walkCalls.length = 0
  walkReply = () => json(503, fail('STORE503-4'))
  routeReply = () => json(200, ok(TRANSIT))
  vi.mocked(locateMe).mockResolvedValue({ lat: 37.5, lng: 127.0 })
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input), 'http://localhost')
      if (url.pathname === '/api/v1/stores/101') return json(200, ok(STORE))
      if (url.pathname === '/api/v1/stores/101/route/origin-walk') {
        walkCalls.push(url)
        return walkReply()
      }
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
  it('선택한 경로의 도보를 붙이고 총 시간·거리를 갱신하며 다시 눌러도 도보를 재조회하지 않는다', async () => {
    routeReply = () => json(200, ok(MULTI_TRANSIT))
    walkReply = () => json(200, ok({mode:'WALK',distanceMeters:120,durationSeconds:120,fare:null,transfers:null,
      steps:[{type:'WALK',lineName:null,guidance:'출발 정류장까지 도보',distanceMeters:120,durationSeconds:120,
        path:[{latitude:37.5,longitude:127},{latitude:37.54,longitude:127.03}]}]}))
    renderPage()
    await userEvent.click(await screen.findByRole('radio', {name:'다른 경로 1'}))
    await waitFor(() => expect(lastMapProps().route).toMatchObject({distanceMeters:6420,durationSeconds:1920,originWalkIncluded:true}))
    const detail=within(screen.getByRole('region', {name:'선택한 경로 안내'}))
    expect(detail.getByText('32분')).toBeInTheDocument()
    expect(lastMapProps().route?.steps[0].type).toBe('WALK')
    const fitKey=lastMapProps().fitKey
    await userEvent.click(screen.getByRole('radio', {name:'추천 경로'}))
    await userEvent.click(screen.getByRole('radio', {name:'다른 경로 1'}))
    expect(lastMapProps().route?.steps.filter((step) => step.type==='WALK')).toHaveLength(1)
    expect(lastMapProps().fitKey).toBe(fitKey)
    expect(walkCalls).toHaveLength(1)
    expect(walkCalls[0].searchParams.get('destinationLatitude')).toBe('37.54')
    expect(walkCalls[0].searchParams.get('destinationLongitude')).toBe('127.03')
    expect(routeCalls).toHaveLength(1)
  })

  it('연속 도보는 합계 한 줄로 접고 펼칠 때 상세를 보존하며 묶음 전체를 지도에서 선택한다', async () => {
    const walk = {...TRANSIT.steps[0], path:[{latitude:37.5,longitude:127}, {latitude:37.51,longitude:127.01}]}
    routeReply = () => json(200, ok({...TRANSIT,steps:[walk,{...walk,guidance:'횡단보도를 건너 역으로 이동'},ALTERNATIVE.steps[0]]}))
    renderPage()
    const summary = await screen.findByText('도보 상세 2개')
    const disclosure = summary.closest('details')!
    expect(disclosure).not.toHaveAttribute('open')
    expect(screen.getAllByRole('button', {name:/^도보 /})).toHaveLength(1)
    await userEvent.click(screen.getByRole('button', {name:/^도보 8분/}))
    expect(lastMapProps().focusIndices).toEqual([0,1])
    await userEvent.click(summary)
    expect(disclosure).toHaveAttribute('open')
    expect(screen.getByText('횡단보도를 건너 역으로 이동', {exact:false})).toBeVisible()
    const item = screen.getByText('횡단보도를 건너 역으로 이동', {exact:false}).closest('li')!
    const viewStep = within(item).getByRole('button', {name:/지도에서 보기/})
    await userEvent.click(viewStep)
    expect(lastMapProps().focusIndices).toEqual([1])
    expect(viewStep).toHaveAttribute('aria-pressed', 'true')
    expect(viewStep).toHaveTextContent('전체 경로 보기')
    await userEvent.click(viewStep)
    expect(lastMapProps().focusIndices).toEqual([])
    expect(viewStep).toHaveAttribute('aria-pressed', 'false')
    expect(walkCalls).toHaveLength(0)
    expect(routeCalls).toHaveLength(1)
  })

  it('추천 순서로 경로를 보여 주고, 재조회 없이 지도·요약·단계를 함께 바꾼다', async () => {
    routeReply = () => json(200, ok(MULTI_TRANSIT))
    renderPage()
    const first = await screen.findByRole('radio', { name: '추천 경로' })
    const other = screen.getByRole('radio', { name: '다른 경로 1' })
    expect(first).toBeChecked()
    const initialFitKey = lastMapProps().fitKey
    expect(lastMapProps().route).toMatchObject({ durationSeconds: 1500 })

    await userEvent.click(other)
    expect(other).toBeChecked()
    const detail = within(screen.getByRole('region', { name: '선택한 경로 안내' }))
    expect(detail.getByText('30분')).toBeInTheDocument()
    expect(detail.getByText('· 1,750원')).toBeInTheDocument()
    expect(detail.getByText('· 환승 없음')).toBeInTheDocument()
    expect(detail.getByText('뚝섬서울숲 → 경동시장앞')).toBeInTheDocument()
    expect(detail.queryByText('지하철 2호선')).not.toBeInTheDocument()
    expect(await detail.findByText(walkNotice)).toBeInTheDocument()
    expect(lastMapProps().route).toEqual(ALTERNATIVE)
    expect(lastMapProps().fitKey).toBe(initialFitKey)

    await userEvent.click(first)
    expect(lastMapProps().route).toMatchObject({ durationSeconds: 1500 })
    expect(screen.queryByText(walkNotice)).not.toBeInTheDocument()
    expect(routeCalls).toEqual(['TRANSIT'])
  })

  it('경로를 바꾸면 선택했던 단계가 해제되고, 돌아와도 이전 단계 선택은 살아나지 않는다', async () => {
    routeReply = () => json(200, ok(MULTI_TRANSIT))
    renderPage()
    await userEvent.click(await screen.findByRole('radio', { name: '다른 경로 1' }))
    await userEvent.click(screen.getByRole('button', { name: /버스 148/ }))
    expect(lastMapProps().focusIndex).toBe(0)
    await userEvent.click(screen.getByRole('radio', { name: '추천 경로' }))
    expect(lastMapProps().focusIndex).toBeNull()
    await userEvent.click(screen.getByRole('radio', { name: '다른 경로 1' }))
    expect(lastMapProps().focusIndex).toBeNull()
    expect(screen.getByRole('button', { name: /버스 148/ })).toHaveAttribute('aria-pressed', 'false')
    expect(routeCalls).toHaveLength(1)
  })

  it('출발지를 바꾸면 새 응답의 첫 경로로 초기화한다', async () => {
    routeReply = () => json(200, ok(MULTI_TRANSIT))
    vi.mocked(searchPoint).mockResolvedValue({ label: '강남역', center: { lat: 37.4979, lng: 127.0276 } })
    renderPage()
    await userEvent.click(await screen.findByRole('radio', { name: '다른 경로 1' }))
    const previousFitKey = lastMapProps().fitKey
    await userEvent.click(screen.getByText('출발지 변경'))
    await userEvent.type(screen.getByRole('textbox', { name: '출발지 검색' }), '강남역')
    await userEvent.click(screen.getByRole('button', { name: '검색' }))
    await waitFor(() => expect(screen.getByRole('radio', { name: '추천 경로' })).toBeChecked())
    expect(lastMapProps().route).toMatchObject({ durationSeconds: 1500 })
    expect(lastMapProps().fitKey).not.toBe(previousFitKey)
    expect(routeCalls).toHaveLength(2)
  })

  it('수단을 변경했다가 돌아오거나 같은 수단을 재조회하면 첫 경로를 선택한다', async () => {
    routeReply = (mode) => json(200, ok(mode === 'TRANSIT' ? MULTI_TRANSIT : {
      ...TRANSIT, mode: 'CAR', fare: null, transfers: null, originWalkIncluded: null, alternatives: [],
    }))
    renderPage()
    await userEvent.click(await screen.findByRole('radio', { name: '다른 경로 1' }))
    await userEvent.click(screen.getByRole('button', { name: '자동차' }))
    await screen.findByText('25분')
    expect(screen.queryByRole('group', { name: '경로 선택' })).not.toBeInTheDocument()
    expect(screen.queryByText(walkNotice)).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '대중교통' }))
    await waitFor(() => expect(screen.getByRole('radio', { name: '추천 경로' })).toBeChecked())
    await userEvent.click(screen.getByRole('radio', { name: '다른 경로 1' }))
    await userEvent.click(screen.getByRole('button', { name: '대중교통' }))
    await waitFor(() => expect(screen.getByRole('radio', { name: '추천 경로' })).toBeChecked())
    expect(routeCalls).toEqual(['TRANSIT', 'CAR', 'TRANSIT', 'TRANSIT'])
  })

  it('추천 경로도 도보 보강이 false면 안내하고, 대체 경로가 없으면 선택 목록을 숨긴다', async () => {
    routeReply = () => json(200, ok({ ...TRANSIT, originWalkIncluded: false, alternatives: [] }))
    renderPage()
    expect(await screen.findByText('첫 정류장까지 도보는 별도 확인해 주세요.')).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: '경로 선택' })).not.toBeInTheDocument()
  })

  it('경로 목록은 Tab으로 진입하고 방향키로 선택할 수 있다', async () => {
    routeReply = () => json(200, ok(MULTI_TRANSIT))
    renderPage()
    const first = await screen.findByRole('radio', { name: '추천 경로' })
    const user = userEvent.setup()
    // 앞선 출발지·수단 입력을 지나 라디오 그룹으로 진입한다
    for (let i = 0; i < 16 && document.activeElement !== first; i += 1) await user.tab()
    expect(first).toHaveFocus()
    await user.keyboard('{ArrowDown}')
    expect(screen.getByRole('radio', { name: '다른 경로 1' })).toBeChecked()
    expect(lastMapProps().route).toEqual(ALTERNATIVE)
    expect(routeCalls).toHaveLength(1)
  })

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
  it('버스·지하철 단계는 눌러서 지도에서 그 구간을 보고, 다시 누르면 해제한다', async () => {
    const bus = {
      type: 'BUS',
      guidance: '간선 110B국민대 (원효로제1동주민센터 > 순천향대학병원.한남오거리)',
      distanceMeters: 4600,
      durationSeconds: 1140,
      lineName: '110B국민대',
      path: [
        { latitude: 37.54, longitude: 126.96 },
        { latitude: 37.53, longitude: 127.0 },
      ],
    }
    routeReply = () => json(200, ok({ ...TRANSIT, steps: [TRANSIT.steps[0], bus] }))
    const user = userEvent.setup()
    renderPage()

    const step = await screen.findByRole('button', { name: /버스 110B국민대/ })
    expect(step).toHaveAttribute('aria-pressed', 'false')
    // 좌표가 없는 도보 단계는 누를 수 없다
    expect(screen.queryByRole('button', { name: /역까지 걷기/ })).not.toBeInTheDocument()

    await user.click(step)
    expect(step).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: '전체 경로' })).toBeInTheDocument()

    await user.click(step)
    expect(step).toHaveAttribute('aria-pressed', 'false')
  })
})
