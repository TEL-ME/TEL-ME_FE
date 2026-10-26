import type { KakaoMaps } from './types'

/** 카카오 지도 JavaScript 키. 없으면 간이 지도로 보여 주고 장소 이름 검색은 꺼진다 */
export const KAKAO_MAP_KEY = (import.meta.env.VITE_KAKAO_MAP_KEY ?? '').trim()

export const hasKakaoKey = KAKAO_MAP_KEY.length > 0

let loading: Promise<KakaoMaps> | null = null

/**
 * 카카오 지도 SDK를 한 번만 불러온다 (clusterer: 핀 묶기, services: 주소·장소 검색).
 * 키가 없거나, 키에 지금 주소(도메인)가 등록돼 있지 않으면 실패한다.
 */
export function loadKakao(): Promise<KakaoMaps> {
  if (!hasKakaoKey) return Promise.reject(new Error('VITE_KAKAO_MAP_KEY가 없어요'))
  if (loading) return loading

  loading = new Promise<KakaoMaps>((resolve, reject) => {
    const fail = () => {
      loading = null // 다음에 다시 시도할 수 있게
      reject(new Error('카카오 지도를 불러오지 못했어요'))
    }
    const script = document.createElement('script')
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(KAKAO_MAP_KEY)}&autoload=false&libraries=clusterer,services`
    script.async = true
    script.onerror = () => {
      script.remove()
      fail()
    }
    script.onload = () => {
      const maps = window.kakao?.maps
      if (!maps) return fail()
      maps.load(() => resolve(maps))
    }
    document.head.appendChild(script)
  })
  return loading
}
