import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { resetStoreSearch, useStoreSearch } from '../../stores/storeSearchStore'
import StoreResults from './StoreResults'

const STORES = [
  { storeId: 114, name: '텔미 강남구4호점', address: '서울특별시 강남구 강남대로118길 46', phone: null, latitude: 37.507231, longitude: 127.026918, distanceMeters: 1030 },
  { storeId: 136, name: '텔미 강남구6호점', address: '서울특별시 강남구 봉은사로30길 24', phone: null, latitude: 37.505967, longitude: 127.035355, distanceMeters: 1120 },
]

const renderResults = (ui: React.ReactNode) => render(<MemoryRouter>{ui}</MemoryRouter>)

afterEach(() => {
  resetStoreSearch()
})

describe('StoreResults', () => {
  it('매장마다 상세로 가는 카드를 만들고, 거리를 잰 기준을 적는다', () => {
    renderResults(<StoreResults items={STORES} context={{ type: 'CURRENT_LOCATION', label: '현재 위치', radiusMeters: 10000 }} />)

    expect(screen.getByText('현재 위치 기준 · 반경 10km')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /텔미 강남구4호점/ })).toHaveAttribute('href', '/stores/114')
    expect(screen.getByText('1.0km')).toBeInTheDocument()
    expect(screen.getByText('거리는 현재 위치에서 잰 직선거리예요.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '다른 지역으로 찾기' })).toHaveAttribute('href', '/stores/region')
  })

  it('"지도로 보기"를 누르면 안내받은 매장만 지도에 올린다', () => {
    renderResults(<StoreResults items={STORES} context={{ type: 'PLACE', label: '강남역', radiusMeters: 3000 }} />)
    fireEvent.click(screen.getByRole('button', { name: '지도로 보기' }))

    const { origin } = useStoreSearch.getState()
    expect(origin.kind).toBe('chat')
    if (origin.kind !== 'chat') return
    expect(origin.label).toBe('강남역')
    expect(origin.stores.map((s) => s.storeId)).toEqual([114, 136])
  })

  it('지역 전체 검색처럼 거리가 없으면 거리 안내를 적지 않는다', () => {
    renderResults(
      <StoreResults
        items={STORES.map((s) => ({ ...s, distanceMeters: null }))}
        context={{ type: 'REGION', label: '서울 강남구', radiusMeters: null }}
      />,
    )
    // 지역 전체 검색은 반경이 없어 기준 이름만 제목으로 둔다
    expect(screen.getByText('서울 강남구 기준')).toBeInTheDocument()
    expect(screen.queryByText(/직선거리/)).not.toBeInTheDocument()
  })

  it('좌표가 없는 예전 메시지는 카드만 보여 주고 "지도로 보기"는 숨긴다', () => {
    renderResults(<StoreResults items={[{ storeId: 2, name: '텔미 부산점' }]} />)
    expect(screen.getByRole('link', { name: /텔미 부산점/ })).toHaveAttribute('href', '/stores/2')
    expect(screen.queryByText(/기준/)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '지도로 보기' })).not.toBeInTheDocument()
  })
})
