import { useState } from 'react'
import { hasKakaoKey } from '../kakao/loadKakao'
import KakaoMap from './KakaoMap'
import type { StoreMapProps } from './mapTypes'
import SimpleMap from './SimpleMap'

/** 매장 지도. 카카오 지도 키(VITE_KAKAO_MAP_KEY)가 없거나 불러오지 못하면 간이 지도로 대신한다 */
export default function StoreMap(props: StoreMapProps) {
  const [failed, setFailed] = useState(false)
  if (!hasKakaoKey || failed) return <SimpleMap {...props} />
  return <KakaoMap {...props} onFail={() => setFailed(true)} />
}
