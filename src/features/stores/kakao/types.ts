/* 카카오 지도 SDK 중 이 앱이 쓰는 부분만 적은 타입 (https://apis.map.kakao.com/web/documentation/) */

export interface KakaoLatLng {
  getLat(): number
  getLng(): number
}

export interface KakaoBounds {
  extend(position: KakaoLatLng): void
  getSouthWest(): KakaoLatLng
  getNorthEast(): KakaoLatLng
}

export interface KakaoMap {
  getCenter(): KakaoLatLng
  setCenter(position: KakaoLatLng): void
  panTo(position: KakaoLatLng): void
  getLevel(): number
  setLevel(level: number, options?: { animate?: boolean }): void
  getBounds(): KakaoBounds
  /** 뒤 네 값은 위·오른쪽·아래·왼쪽 여백(px) */
  setBounds(bounds: KakaoBounds, top?: number, right?: number, bottom?: number, left?: number): void
  relayout(): void
  panBy(dx: number, dy: number): void
  getProjection(): { coordsFromContainerPoint(point: unknown): KakaoLatLng }
  setDraggable(draggable: boolean): void
  setZoomable(zoomable: boolean): void
}

export interface KakaoMarker {
  setMap(map: KakaoMap | null): void
  setImage(image: unknown): void
  setZIndex(zIndex: number): void
  getPosition(): KakaoLatLng
}

export interface KakaoOverlay {
  setMap(map: KakaoMap | null): void
  setPosition(position: KakaoLatLng): void
}

export interface KakaoClusterer {
  addMarkers(markers: KakaoMarker[]): void
  clear(): void
}

export interface KakaoAddressResult {
  address_name: string
  /** REGION(지명) · ROAD(도로명) · REGION_ADDR(지번 주소) · ROAD_ADDR(도로명 주소) */
  address_type: string
  x: string
  y: string
  address: { b_code: string } | null
}

export interface KakaoPlaceResult {
  place_name: string
  x: string
  y: string
}

export interface KakaoMaps {
  load(callback: () => void): void
  LatLng: new (lat: number, lng: number) => KakaoLatLng
  LatLngBounds: new () => KakaoBounds
  Size: new (width: number, height: number) => unknown
  Point: new (x: number, y: number) => unknown
  Map: new (container: HTMLElement, options: { center: KakaoLatLng; level: number; draggable?: boolean }) => KakaoMap
  Marker: new (options: { position: KakaoLatLng; image?: unknown; title?: string; clickable?: boolean; zIndex?: number }) => KakaoMarker
  MarkerImage: new (src: string, size: unknown, options?: { offset?: unknown }) => unknown
  CustomOverlay: new (options: {
    position: KakaoLatLng
    content: HTMLElement | string
    xAnchor?: number
    yAnchor?: number
    zIndex?: number
    clickable?: boolean
    map?: KakaoMap
  }) => KakaoOverlay
  MarkerClusterer: new (options: {
    map: KakaoMap
    averageCenter?: boolean
    minLevel?: number
    gridSize?: number
    styles?: Record<string, string>[]
  }) => KakaoClusterer
  event: {
    addListener(target: unknown, type: string, handler: () => void): void
    removeListener(target: unknown, type: string, handler: () => void): void
  }
  services: {
    Status: { OK: string; ZERO_RESULT: string; ERROR: string }
    Geocoder: new () => {
      addressSearch(query: string, callback: (result: KakaoAddressResult[], status: string) => void): void
    }
    Places: new () => {
      keywordSearch(query: string, callback: (result: KakaoPlaceResult[], status: string) => void): void
    }
  }
}

declare global {
  interface Window {
    kakao?: { maps: KakaoMaps }
  }
}
