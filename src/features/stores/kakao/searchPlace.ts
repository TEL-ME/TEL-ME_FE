import { toRegionCode, type LatLng } from '../format'
import { loadKakao } from './loadKakao'
import type { KakaoMaps } from './types'

/** 입력한 이름으로 찾은 곳. 지명이면 지역 검색, 주소·장소면 그 주변 검색에 쓴다 */
export type PlaceHit =
  | { kind: 'region'; code: string; label: string }
  | { kind: 'place'; label: string; center: LatLng }

const searchAddress = (maps: KakaoMaps, query: string) =>
  new Promise<PlaceHit | null>((resolve) => {
    new maps.services.Geocoder().addressSearch(query, (result, status) => {
      const first = status === maps.services.Status.OK ? result[0] : undefined
      if (!first) return resolve(null)
      const code = first.address_type === 'REGION' ? toRegionCode(first.address?.b_code) : null
      if (code) return resolve({ kind: 'region', code, label: first.address_name })
      resolve({ kind: 'place', label: first.address_name, center: { lat: Number(first.y), lng: Number(first.x) } })
    })
  })

const searchKeyword = (maps: KakaoMaps, query: string) =>
  new Promise<PlaceHit | null>((resolve) => {
    new maps.services.Places().keywordSearch(query, (result, status) => {
      const first = status === maps.services.Status.OK ? result[0] : undefined
      resolve(first ? { kind: 'place', label: first.place_name, center: { lat: Number(first.y), lng: Number(first.x) } } : null)
    })
  })

/**
 * 지명·주소·장소 이름을 찾는다 (백엔드 LocationLookupService와 같은 순서).
 * 주소 검색이 행정구역을 정확히 맞추므로 먼저 보고, 없으면 장소 이름으로 찾는다. 못 찾으면 null.
 */
export async function searchPlace(query: string): Promise<PlaceHit | null> {
  const keyword = query.trim()
  if (!keyword) return null
  const maps = await loadKakao()
  const hit = (await searchAddress(maps, keyword)) ?? (await searchKeyword(maps, keyword))
  if (hit?.kind === 'place' && !(Number.isFinite(hit.center.lat) && Number.isFinite(hit.center.lng))) return null
  return hit
}
