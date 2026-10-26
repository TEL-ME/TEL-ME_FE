import { useCallback, useEffect, useRef, useState } from 'react'
import { storeApi, type RouteMode, type StoreRoute } from '../../../api/stores'
import type { LatLng } from '../format'

export type RouteState =
  | { status: 'idle' }
  | { status: 'loading'; mode: RouteMode }
  | { status: 'success'; mode: RouteMode; data: StoreRoute; seq: number }
  | { status: 'error'; mode: RouteMode; error: unknown }

/**
 * 매장 길찾기 요청. 요청마다 카카오 호출 예산을 쓰므로 react-query를 쓰지 않는다
 * (기본 설정의 5xx 자동 재시도·응답 캐시·포커스 재조회를 피한다).
 * - 같은 요청이 진행 중이면 다시 보내지 않는다 (버튼 연타)
 * - 새 요청을 보내면 이전 요청을 취소하고, 늦게 온 이전 응답은 버린다
 * - 결과는 이 화면의 메모리에만 둔다
 */
export function useStoreRoute(storeId: number | null) {
  const [state, setState] = useState<RouteState>({ status: 'idle' })
  const current = useRef<{ controller: AbortController; key: string; done: boolean } | null>(null)
  const seq = useRef(0)

  const request = useCallback(
    (mode: RouteMode, origin: LatLng) => {
      if (storeId == null) return
      const key = `${storeId}:${mode}:${origin.lat}:${origin.lng}`
      if (current.current && !current.current.done && current.current.key === key) return

      current.current?.controller.abort()
      const mine = { controller: new AbortController(), key, done: false }
      current.current = mine
      setState({ status: 'loading', mode })

      storeApi
        .route(storeId, { mode, originLatitude: origin.lat, originLongitude: origin.lng }, mine.controller.signal)
        .then((data) => {
          if (current.current !== mine) return
          seq.current += 1
          setState({ status: 'success', mode, data, seq: seq.current })
        })
        .catch((error: unknown) => {
          if (current.current !== mine) return
          setState({ status: 'error', mode, error })
        })
        .finally(() => {
          mine.done = true
        })
    },
    [storeId],
  )

  // 화면을 떠나거나 매장이 바뀌면 진행 중인 요청을 끊고 결과를 비운다
  useEffect(
    () => () => {
      current.current?.controller.abort()
      current.current = null
      setState({ status: 'idle' })
    },
    [storeId],
  )

  return { state, request }
}
