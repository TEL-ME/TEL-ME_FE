import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'
import { storeApi, type RegionStore, type ServiceTypeCode } from '../../api/stores'
import { distanceMeters, districtName, type LatLng } from './format'
import { sidoOf } from './regions'
import type { SearchOrigin } from './storeSearchStore'

/** 지도에 한 번에 올리는 매장 수 (서버 최대 20). 목록도 같은 결과를 쓴다 */
export const NEARBY_LIMIT = 20
/** 업무를 화면에서 거를 때, 이보다 적게 남으면 다음 페이지를 더 받는다 */
const FILTERED_MIN = 5
/** 지역 검색 한 페이지 */
export const REGION_PAGE_SIZE = 20

export function useServiceTypes() {
  return useQuery({
    queryKey: ['stores', 'service-types'],
    queryFn: () => storeApi.serviceTypes().then((r) => r.serviceTypes),
    staleTime: Infinity,
  })
}

export function useStoreDetail(storeId: number | null) {
  return useQuery({
    queryKey: ['stores', 'detail', storeId],
    queryFn: ({ signal }) => storeApi.detail(storeId!, signal),
    enabled: storeId != null,
  })
}

/** 목록·지도에 함께 쓰는 매장 한 곳 */
export interface StoreListItem {
  storeId: number
  name: string
  address: string
  latitude: number
  longitude: number
  /** 내 위치(없으면 검색한 곳)에서의 직선거리. 기준이 없으면 null */
  distanceMeters: number | null
}

/**
 * 검색 기준(origin)에 맞는 API를 골라 매장 목록을 만든다.
 * - near · area: GET /stores/nearby (가까운 순, 최대 20곳)
 * - region: GET /stores/region (매장 번호순, 20곳씩 더 보기)
 * - chat: 상담에서 받은 매장을 그대로 쓴다 (API를 부르지 않는다)
 *
 * 지역 검색은 업무를 하나만 받는다. 여러 개를 고르면 첫 번째만 서버에 보내고 나머지는 받은 결과에서 거른다.
 */
export function useStoreList(origin: SearchOrigin, services: ServiceTypeCode[], me: LatLng | null) {
  const isRegion = origin.kind === 'region'
  const fixedStores = origin.kind === 'chat' ? origin.stores : null
  const center = origin.kind === 'near' || origin.kind === 'area' ? origin.center : null
  const radiusMeters = origin.kind === 'area' ? origin.radiusMeters : undefined

  const nearby = useQuery({
    queryKey: ['stores', 'nearby', center?.lat, center?.lng, radiusMeters, services],
    queryFn: ({ signal }) =>
      storeApi.nearby(
        { latitude: center!.lat, longitude: center!.lng, radiusMeters, limit: NEARBY_LIMIT, serviceTypes: services },
        signal,
      ),
    enabled: center != null,
    placeholderData: keepPreviousData,
  })

  const regionCode = isRegion ? origin.code : ''
  const [serverService, ...restServices] = services
  const region = useInfiniteQuery({
    queryKey: ['stores', 'region', regionCode, serverService ?? null],
    queryFn: ({ pageParam, signal }) =>
      storeApi.region({ region: regionCode, serviceType: serverService, page: pageParam, size: REGION_PAGE_SIZE }, signal),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.page + 1 < last.totalPages ? last.page + 1 : null),
    enabled: isRegion,
  })

  const regionPages = region.data?.pages
  const nearbyStores = nearby.data?.stores
  const restKey = restServices.join(',')
  const measureFromOrigin = origin.kind === 'near'

  // 지도가 핀을 다시 그리지 않도록, 받은 결과가 바뀔 때만 목록을 새로 만든다
  const items = useMemo<StoreListItem[]>(() => {
    if (fixedStores) return fixedStores
    const distanceFromMe = (s: { latitude: number; longitude: number }) =>
      me ? distanceMeters(me, { lat: s.latitude, lng: s.longitude }) : null
    const base = (s: { storeId: number; name: string; address: string; latitude: number; longitude: number }) => ({
      storeId: s.storeId,
      name: s.name,
      address: s.address,
      latitude: s.latitude,
      longitude: s.longitude,
    })

    if (isRegion) {
      const rest = restKey ? restKey.split(',') : []
      return (regionPages ?? [])
        .flatMap((p) => p.stores)
        .filter((s) => rest.every((code) => s.services.some((sv) => sv.code === code)))
        .map((s) => ({ ...base(s), distanceMeters: distanceFromMe(s) }))
    }
    // near는 검색한 곳이 내 위치라 서버가 준 거리를 그대로 쓴다. 그 밖에는 내 위치를 알 때만 거리를 보여 준다
    return (nearbyStores ?? []).map((s) => ({
      ...base(s),
      distanceMeters: measureFromOrigin ? s.distanceMeters : distanceFromMe(s),
    }))
  }, [fixedStores, isRegion, regionPages, nearbyStores, restKey, measureFromOrigin, me])

  // 화면에서 거르다 보면 한 페이지에 몇 곳 안 남을 수 있다. 목록이 너무 짧으면 다음 페이지를 이어서 받는다
  const { hasNextPage, isFetching: regionFetching, fetchNextPage } = region
  const tooShort = isRegion && restKey !== '' && items.length < FILTERED_MIN && hasNextPage && !regionFetching
  useEffect(() => {
    if (tooShort) void fetchNextPage()
  }, [tooShort, fetchNextPage])

  if (fixedStores) {
    return {
      items,
      total: items.length,
      isPending: false,
      isError: false,
      isFetching: false,
      refetch: () => {},
      hasMore: false,
      isFetchingMore: false,
      fetchMore: () => {},
    }
  }
  if (isRegion) {
    return {
      items,
      /** 전체 개수. 화면에서 거른 경우에는 서버 합계를 알 수 없어 null */
      total: restKey ? null : (regionPages?.[0]?.totalElements ?? null),
      isPending: region.isPending,
      isError: region.isError,
      isFetching: region.isFetching,
      refetch: () => void region.refetch(),
      hasMore: region.hasNextPage,
      isFetchingMore: region.isFetchingNextPage,
      fetchMore: () => void region.fetchNextPage(),
    }
  }
  return {
    items,
    total: nearby.data ? items.length : null,
    isPending: nearby.isPending,
    isError: nearby.isError,
    isFetching: nearby.isFetching,
    refetch: () => void nearby.refetch(),
    hasMore: false,
    isFetchingMore: false,
    fetchMore: () => {},
  }
}

export interface District {
  /** 법정동코드 앞 5자리 */
  code: string
  name: string
  count: number
}

const DISTRICT_PAGE_SIZE = 50
/** 시·군·구 목록을 만들 때 읽는 최대 페이지. 넘으면 일부만 보여 준다 */
const DISTRICT_MAX_PAGES = 10

/**
 * 그 시·도에서 매장이 있는 시·군·구 목록.
 * 지역 목록 API가 없어서 지역 검색 결과를 끝까지 읽어 법정동코드 앞 5자리로 묶는다.
 */
export function useDistricts(sidoCode: string | null) {
  return useQuery({
    queryKey: ['stores', 'districts', sidoCode],
    enabled: sidoCode != null,
    staleTime: 5 * 60_000,
    queryFn: async ({ signal }) => {
      const stores: RegionStore[] = []
      let totalPages = 1
      let total = 0
      for (let page = 0; page < totalPages && page < DISTRICT_MAX_PAGES; page++) {
        const res = await storeApi.region({ region: sidoCode!, page, size: DISTRICT_PAGE_SIZE }, signal)
        stores.push(...res.stores)
        totalPages = res.totalPages
        total = res.totalElements
      }
      const byCode = new Map<string, District>()
      for (const s of stores) {
        if (!s.regionCode || s.regionCode.length < 5) continue
        const code = s.regionCode.slice(0, 5)
        const found = byCode.get(code)
        if (found) found.count += 1
        else byCode.set(code, { code, name: districtName(s.address) ?? sidoOf(code)?.label ?? code, count: 1 })
      }
      return {
        districts: [...byCode.values()].sort((a, b) => a.name.localeCompare(b.name, 'ko')),
        total,
        /** 매장이 너무 많아 끝까지 읽지 못했다 */
        partial: totalPages > DISTRICT_MAX_PAGES,
      }
    },
  })
}
