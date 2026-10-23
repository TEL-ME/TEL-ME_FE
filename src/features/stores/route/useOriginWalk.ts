import { useEffect, useMemo, useSyncExternalStore } from 'react'
import { storeApi, type OriginWalkQuery, type StoreRoute } from '../../../api/stores'
import type { LatLng } from '../format'
import { needsOriginWalkCheck, stepPoints } from './routeText'

interface WalkEntry {
  status: 'loading' | 'success' | 'error'
  controller: AbortController
  data?: StoreRoute
  error?: unknown
}

function queryFor(route: StoreRoute | undefined, origin: LatLng | null): OriginWalkQuery | null {
  if (!route || !origin || !needsOriginWalkCheck(route, origin)) return null
  // 뒤의 정류장 좌표를 쓰면 기존 도보와 중복될 수 있어 첫 구간만 확인한다
  const first = route.steps[0] && stepPoints(route.steps[0])[0]
  return first ? { originLatitude: origin.lat, originLongitude: origin.lng, destinationLatitude: first.latitude, destinationLongitude: first.longitude } : null
}

const queryKey = (storeId: number | null, query: OriginWalkQuery | null) => query
  ? `${storeId}:${query.originLatitude}:${query.originLongitude}:${query.destinationLatitude}:${query.destinationLongitude}` : null

// 요청 병합과 캐시 수명은 React 렌더와 분리하고, 화면은 불변 스냅샷만 구독한다
function createWalkCache(storeId: number | null, scope: string) {
  const entries = new Map<string, WalkEntry>()
  const listeners = new Set<() => void>()
  let snapshot = new Map<string, WalkEntry>()
  const publish = () => {
    snapshot = new Map(entries)
    listeners.forEach((listener) => listener())
  }
  const load = (key: string, query: OriginWalkQuery) => {
    if (storeId == null || entries.has(key)) return
    const entry: WalkEntry = { status: 'loading', controller: new AbortController() }
    entries.set(key, entry)
    publish()
    storeApi.originWalk(storeId, query, entry.controller.signal)
      .then((data) => {
        if (entries.get(key) !== entry) return
        entries.set(key, { ...entry, status: 'success', data })
        publish()
      })
      .catch((error: unknown) => {
        if (entries.get(key) !== entry) return
        entries.set(key, { ...entry, status: 'error', error })
        publish()
      })
  }
  return {
    scope,
    getSnapshot: () => snapshot,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } },
    load,
    retry: (key: string, query: OriginWalkQuery) => {
      if (entries.get(key)?.status !== 'error') return
      entries.delete(key)
      load(key, query)
    },
    dispose: () => {
      entries.forEach((entry) => entry.controller.abort())
      entries.clear()
      snapshot = new Map()
    },
  }
}

/** 이 화면의 메모리에서만 응답·진행 중 요청·실패를 공유한다. 출발지 변경·화면 종료 때 비운다 */
export function useOriginWalk(storeId: number | null, origin: LatLng | null, routes: StoreRoute[], selectedIndex: number) {
  const originLat = origin?.lat
  const originLng = origin?.lng
  const scope = `${storeId}:${originLat}:${originLng}`
  const cache = useMemo(() => createWalkCache(storeId, scope), [storeId, scope])
  const entries = useSyncExternalStore(cache.subscribe, cache.getSnapshot)
  const target = queryFor(routes[selectedIndex], origin)
  const targetLat = target?.destinationLatitude
  const targetLng = target?.destinationLongitude
  const query = useMemo<OriginWalkQuery | null>(() => originLat != null && originLng != null && targetLat != null && targetLng != null
    ? { originLatitude: originLat, originLongitude: originLng, destinationLatitude: targetLat, destinationLongitude: targetLng } : null,
  [originLat, originLng, targetLat, targetLng])
  const key = queryKey(storeId, query)

  useEffect(() => () => cache.dispose(), [cache])
  useEffect(() => {
    let cancelled = false
    // StrictMode 정리 직후 취소된 요청은 네트워크로 보내지 않는다
    queueMicrotask(() => { if (!cancelled && key && query) cache.load(key, query) })
    return () => { cancelled = true }
  }, [key, query, cache])

  const enriched = useMemo(() => routes.map((route) => {
    const entryKey = queryKey(storeId, queryFor(route, originLat != null && originLng != null ? { lat: originLat, lng: originLng } : null))
    const entry = entryKey ? entries.get(entryKey) : undefined
    if (!entry?.data || entry.status !== 'success') return route
    const merged = { ...route, originWalkIncluded: true,
      distanceMeters: route.distanceMeters + entry.data.distanceMeters,
      durationSeconds: route.durationSeconds + entry.data.durationSeconds,
      steps: [...entry.data.steps, ...route.steps] }
    return merged
  }), [routes, entries, storeId, originLat, originLng])
  const entry = key ? entries.get(key) : undefined
  const retry = () => {
    if (key && query) cache.retry(key, query)
  }
  return { routes: enriched, status: entry?.status ?? 'idle', error: entry?.error, retry }
}
