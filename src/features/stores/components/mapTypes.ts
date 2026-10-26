import type { LatLng } from '../format'

export interface MapStore {
  storeId: number
  name: string
  latitude: number
  longitude: number
}

export interface StoreMapProps {
  stores: MapStore[]
  selectedId: number | null
  /** 내 위치 (받았을 때만) */
  me: LatLng | null
  /**
   * 값이 바뀌면 매장이 모두 보이게 지도를 맞춘다.
   * null이면 지금 보던 곳을 그대로 둔다 (불러오는 중이거나, 사용자가 지도를 옮겨 다시 검색한 경우).
   */
  fitKey: string | null
  /** 매장과 함께 화면에 넣을 곳 (내 주변 검색의 내 위치). 매장이 없으면 이곳을 가운데에 둔다 */
  anchor: LatLng | null
  /** 아래 시트가 가리는 높이(px). 이만큼을 빼고 가운데를 잡는다 */
  bottomInset: number
  /** 위쪽 검색창이 가리는 높이(px) */
  topInset?: number
  /** false면 옮기거나 누를 수 없는 작은 지도 (매장 상세) */
  interactive?: boolean
  label: string
  onSelect?: (storeId: number | null) => void
  /** 사용자가 지도를 직접 옮기거나 확대·축소했을 때. 보이는 곳의 가운데와 반경 */
  onMoved?: (center: LatLng, radiusMeters: number) => void
}
