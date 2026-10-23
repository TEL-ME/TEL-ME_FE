import { api } from './client'

// ---- 매장 (TEL-ME_BE develop 기준: store/controller/StoreController, StoreRegionSearchController) ----

/** 업무 코드. 목록은 GET /stores/service-types로 받는다 */
export type ServiceTypeCode = 'NEW_LINE' | 'PORT_IN' | 'NAME_CHANGE' | 'USIM_REISSUE'

export interface StoreServiceType {
  code: ServiceTypeCode
  name: string
}

/** 가까운 매장 한 곳. 영업 상태(영업 중·종료)는 백엔드에 아직 없다(TELME-101) */
export interface NearbyStore {
  storeId: number
  name: string
  address: string
  phone: string | null
  latitude: number
  longitude: number
  /** 검색한 좌표에서의 직선거리(m) */
  distanceMeters: number
}

export interface NearbyStores {
  stores: NearbyStore[]
  /** 실제로 검색한 반경. 10km를 넘겨 보내면 10km로 줄어든다 */
  radiusMeters: number
}

export interface RegionStore {
  storeId: number
  name: string
  address: string
  phone: string | null
  /** 법정동코드 10자리 */
  regionCode: string | null
  latitude: number
  longitude: number
  services: StoreServiceType[]
}

export interface RegionStores {
  stores: RegionStore[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export type DayOfWeek = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY'

export interface StoreHours {
  dayOfWeek: DayOfWeek
  /** "10:00:00". 휴무일이면 null */
  openTime: string | null
  closeTime: string | null
  closed: boolean
}

export interface StoreDetail {
  storeId: number
  name: string
  address: string
  phone: string | null
  latitude: number
  longitude: number
  /** 등록된 요일만 온다 (월요일부터) */
  hours: StoreHours[]
  services: StoreServiceType[]
}

export interface NearbyQuery {
  latitude: number
  longitude: number
  /** 생략하면 10km. 10km를 넘으면 서버가 10km로 줄인다 */
  radiusMeters?: number
  /** 1~20. 생략하면 5 */
  limit?: number
  /** 여러 개면 모두 가능한 매장만 */
  serviceTypes?: ServiceTypeCode[]
}

export interface RegionQuery {
  /** 법정동코드 앞자리 (시·도 2, 시 4, 시·군·구 5, 읍·면·동 8, 리 10자리) */
  region: string
  /** 한 개만 받는다 */
  serviceType?: ServiceTypeCode
  page?: number
  /** 1~50. 생략하면 20 */
  size?: number
}

// ---- 길찾기 (TELME-189: GET /stores/{storeId}/route) ----

/** 이동 수단. 고른 수단 하나만 조회한다 */
export type RouteMode = 'CAR' | 'TRANSIT' | 'WALK' | 'BICYCLE'

/** 경로 한 단계의 종류. 대중교통은 WALK · BUS · SUBWAY가 섞여 온다 */
export type RouteStepType = 'DRIVE' | 'WALK' | 'BICYCLE' | 'BUS' | 'SUBWAY'

export interface RouteCoordinate {
  latitude: number
  longitude: number
}

export interface RouteStep {
  type: RouteStepType
  guidance: string | null
  distanceMeters: number
  durationSeconds: number
  /** 버스 번호·지하철 노선. BUS · SUBWAY 단계에만 값이 있다 */
  lineName: string | null
  /** 지도에 그릴 좌표. 비어 있을 수 있다 */
  path: RouteCoordinate[]
}

export interface StoreRoute {
  mode: RouteMode
  distanceMeters: number
  durationSeconds: number
  /** 대중교통만 값이 있다. null은 무료가 아니라 "정보 없음" */
  fare: number | null
  /** 대중교통만 값이 있다. 0은 환승 없음, null은 정보 없음 */
  transfers: number | null
  /** 출발지와 매장이 같은 곳이면 거리·시간 0에 빈 배열 */
  steps: RouteStep[]
  /** 대중교통의 출발지 도보 보강 여부. 다른 수단은 null, 구버전 응답은 생략 */
  originWalkIncluded?: boolean | null
  /** 첫 추천 경로를 제외한 대체 경로. 서버 추천 순서이며 구버전 응답은 생략 */
  alternatives?: StoreRoute[]
}

export interface RouteQuery {
  mode: RouteMode
  /** 33~39 (대한민국 범위) */
  originLatitude: number
  /** 124~132 */
  originLongitude: number
}

export interface OriginWalkQuery {
  originLatitude: number
  originLongitude: number
  destinationLatitude: number
  destinationLongitude: number
}

const BASE = '/api/v1/stores'

export const storeApi = {
  /** 좌표에서 가까운 순. 결과가 없으면 stores가 빈 배열. openNow는 아직 지원하지 않아 보내지 않는다(STORE400-4) */
  nearby: ({ serviceTypes, ...q }: NearbyQuery, signal?: AbortSignal) =>
    api<NearbyStores>(`${BASE}/nearby`, { query: { ...q, serviceTypes: serviceTypes?.length ? serviceTypes : undefined }, signal }),

  /** 지역(법정동코드)으로 찾기. 매장 번호순 */
  region: (q: RegionQuery, signal?: AbortSignal) => api<RegionStores>(`${BASE}/region`, { query: { ...q }, signal }),

  /** 없는 매장·폐점 매장이면 404(STORE404-0) */
  detail: (storeId: number, signal?: AbortSignal) => api<StoreDetail>(`${BASE}/${storeId}`, { signal }),

  serviceTypes: () => api<{ serviceTypes: StoreServiceType[] }>(`${BASE}/service-types`),

  /**
   * 현재 위치(출발지)에서 매장까지 경로. 목적지 좌표는 서버가 매장 DB에서 읽는다.
   * 요청마다 카카오 호출 예산을 쓰므로 자동 재시도·캐시 없이 필요할 때만 부른다.
   * 실패 코드: STORE400-5(최대 거리 초과) · STORE404-0(매장 없음) · STORE404-1(경로 없음)
   *          · STORE503-2(연동 실패) · STORE503-3(길찾기 꺼짐) · STORE503-4(수단별 하루 예산 소진)
   */
  route: (storeId: number, q: RouteQuery, signal?: AbortSignal) =>
    api<StoreRoute>(`${BASE}/${storeId}/route`, { query: { ...q }, signal }),

  /** 선택한 경로의 첫 좌표까지 도보. WALK 예산을 사용하므로 화면에서 중복 요청을 합친다 */
  originWalk: (storeId: number, q: OriginWalkQuery, signal?: AbortSignal) =>
    api<StoreRoute>(`${BASE}/${storeId}/route/origin-walk`, { query: { ...q }, signal }),
}
