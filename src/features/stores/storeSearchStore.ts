import { create } from 'zustand'
import type { ServiceTypeCode } from '../../api/stores'
import type { LatLng } from './format'
import type { StoreListItem } from './queries'
import { DEFAULT_SIDO } from './regions'

/**
 * 지금 어떤 기준으로 매장을 찾고 있는지.
 * - region: 지역(법정동코드 앞자리). 처음 들어오면 서울
 * - near: 내 위치에서 가까운 순
 * - area: 지도에서 고른 곳(다시 검색) 또는 검색한 장소 주변
 * - chat: 상담에서 안내받은 매장을 그대로 지도에 올린다 (다시 찾지 않는다)
 */
export type SearchOrigin =
  | { kind: 'region'; code: string; label: string; /** 처음 들어왔을 때 자동으로 고른 지역 */ auto?: boolean }
  | { kind: 'near'; center: LatLng }
  | { kind: 'area'; center: LatLng; radiusMeters: number; label?: string }
  | { kind: 'chat'; /** 거리를 잰 기준 이름 (예: 현재 위치, 강남역) */ label: string; stores: StoreListItem[] }

interface StoreSearchState {
  origin: SearchOrigin
  /** 고른 업무 (여러 개면 모두 가능한 매장만) */
  services: ServiceTypeCode[]
  /** 이번 방문에서 받은 내 위치. 저장하지 않는다 */
  me: LatLng | null
  /** 지도에서 누른 매장 */
  selectedId: number | null
  sheetFull: boolean
}

const initial: StoreSearchState = {
  origin: { kind: 'region', code: DEFAULT_SIDO.code, label: DEFAULT_SIDO.label, auto: true },
  services: [],
  me: null,
  selectedId: null,
  sheetFull: false,
}

/** 매장 화면의 검색 상태. 상세·지역 선택 화면에 다녀와도 그대로 남는다 */
export const useStoreSearch = create<StoreSearchState>(() => initial)

export function setOrigin(origin: SearchOrigin) {
  useStoreSearch.setState({ origin, selectedId: null, sheetFull: false })
}

export function searchNearMe(me: LatLng) {
  useStoreSearch.setState({ me, origin: { kind: 'near', center: me }, selectedId: null, sheetFull: false })
}

/** 상담 답변의 "지도로 보기": 안내받은 매장만 지도에 올린다 */
export function showStoresFromChat(label: string, stores: StoreListItem[]) {
  useStoreSearch.setState({ origin: { kind: 'chat', label, stores }, services: [], selectedId: null, sheetFull: false })
}

/** 다른 화면(상담)에서 받은 내 위치를 매장 화면에서도 쓴다 */
export function rememberMe(me: LatLng) {
  useStoreSearch.setState({ me })
}

export function toggleService(code: ServiceTypeCode) {
  const { services } = useStoreSearch.getState()
  useStoreSearch.setState({
    services: services.includes(code) ? services.filter((c) => c !== code) : [...services, code],
    selectedId: null,
  })
}

export function clearServices() {
  useStoreSearch.setState({ services: [], selectedId: null })
}

export function selectStore(storeId: number | null) {
  useStoreSearch.setState({ selectedId: storeId })
}

export function setSheetFull(sheetFull: boolean) {
  useStoreSearch.setState({ sheetFull })
}

/** 테스트용 */
export function resetStoreSearch() {
  useStoreSearch.setState(initial)
}
