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
}
