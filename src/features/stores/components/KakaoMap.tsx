import { useEffect, useRef, useState } from 'react'
import { distanceMeters, type LatLng } from '../format'
import { loadKakao } from '../kakao/loadKakao'
import type { KakaoClusterer, KakaoMap as KMap, KakaoMaps, KakaoMarker, KakaoOverlay } from '../kakao/types'
import type { StoreMapProps } from './mapTypes'

/** 처음 그릴 때의 가운데 (서울시청). 매장을 받으면 바로 그쪽으로 맞춘다 */
const FALLBACK_CENTER: LatLng = { lat: 37.5665, lng: 126.978 }
/** 이 레벨부터(더 멀리 볼수록 숫자가 크다) 가까운 핀을 숫자 묶음으로 보여 준다 */
const CLUSTER_MIN_LEVEL = 6
/** 매장을 맞춰 보여 줄 때 이보다 더 확대하지 않는다 */
const CLOSEST_LEVEL = 3
const MAX_RADIUS = 10_000
const MIN_RADIUS = 200

// 지도 타일은 라이트 색뿐이라 핀 색은 테마와 상관없이 고정한다
const PIN_COLOR = '#c34074'
const PIN_SELECTED_COLOR = '#2b262d'
const ME_COLOR = '#6a4f8f'

const pinSvg = (fill: string) =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-15 -36 30 38"><path d="M0 0C-4-8-12-12-12-21A12 12 0 1 1 12-21C12-12 4-8 0 0z" fill="${fill}" stroke="#fff" stroke-width="2.5"/><circle cy="-21" r="4.5" fill="#fff"/></svg>`,
  )}`

function nameLabel(name: string): HTMLElement {
  const wrap = document.createElement('div')
  wrap.style.cssText = 'padding-bottom:52px;pointer-events:none'
  const pill = document.createElement('div')
  pill.textContent = name
  pill.style.cssText =
    'padding:5px 11px;border-radius:999px;background:#2b262d;color:#fff;font:700 12px/16px Pretendard,system-ui,sans-serif;white-space:nowrap;box-shadow:0 4px 12px rgba(43,38,45,0.25)'
  wrap.appendChild(pill)
  return wrap
}

function meDot(): HTMLElement {
  const dot = document.createElement('div')
  dot.setAttribute('aria-hidden', 'true')
  dot.style.cssText = `width:16px;height:16px;border-radius:50%;background:${ME_COLOR};border:3px solid #fff;box-shadow:0 0 0 9px rgba(106,79,143,0.18);pointer-events:none`
  return dot
}

interface Ctx {
  maps: KakaoMaps
  map: KMap
  clusterer: KakaoClusterer | null
  markers: Map<number, KakaoMarker>
  images: { normal: unknown; selected: unknown }
  label: KakaoOverlay | null
  me: KakaoOverlay | null
  /** 코드가 지도를 옮기는 중. 이때의 확대·축소는 "사용자가 옮김"으로 치지 않는다 */
  quiet: boolean
  quietTimer: number | undefined
}

interface KakaoMapProps extends StoreMapProps {
  /** SDK를 불러오지 못했을 때 (키 오류, 등록 안 된 도메인, 네트워크) */
  onFail: () => void
}

/** 카카오 지도 위에 매장 핀을 올린다. 멀리서 보면 핀을 숫자로 묶는다(MarkerClusterer) */
export default function KakaoMap({
  stores,
  selectedId,
  me,
  fitKey,
  anchor,
  bottomInset,
  topInset = 0,
  interactive = true,
  label,
  onSelect,
  onMoved,
  onFail,
}: KakaoMapProps) {
  const boxRef = useRef<HTMLDivElement>(null)
  const ctxRef = useRef<Ctx | null>(null)
  const fittedRef = useRef<string | null>(null)
  const [ready, setReady] = useState(false)

  // 지도 이벤트는 한 번만 걸고, 그 안에서 늘 최신 값을 읽는다
  const latest = useRef({ onSelect, onMoved, onFail, bottomInset, topInset })
  useEffect(() => {
    latest.current = { onSelect, onMoved, onFail, bottomInset, topInset }
  })

  // 1) 지도 만들기
  useEffect(() => {
    const box = boxRef.current
    if (!box) return
    let cancelled = false
    let observer: ResizeObserver | undefined

    loadKakao()
      .then((maps) => {
        if (cancelled) return
        const map = new maps.Map(box, {
          center: new maps.LatLng(FALLBACK_CENTER.lat, FALLBACK_CENTER.lng),
          level: interactive ? 7 : 4,
        })
        const ctx: Ctx = {
          maps,
          map,
          clusterer: null,
          markers: new Map(),
          images: {
            normal: new maps.MarkerImage(pinSvg(PIN_COLOR), new maps.Size(30, 38), { offset: new maps.Point(15, 36) }),
            selected: new maps.MarkerImage(pinSvg(PIN_SELECTED_COLOR), new maps.Size(38, 48), { offset: new maps.Point(19, 45.5) }),
          },
          label: null,
          me: null,
          quiet: false,
          quietTimer: undefined,
        }

        if (interactive) {
          ctx.clusterer = new maps.MarkerClusterer({
            map,
            averageCenter: true,
            minLevel: CLUSTER_MIN_LEVEL,
            styles: [
              {
                width: '40px',
                height: '40px',
                background: PIN_COLOR,
                border: '2.5px solid #fff',
                borderRadius: '50%',
                boxShadow: '0 0 0 6px rgba(195,64,116,0.2)',
                color: '#fff',
                fontSize: '14px',
                fontWeight: '800',
                lineHeight: '35px',
                textAlign: 'center',
              },
            ],
          })

          // 보이는 부분(위 검색창과 아래 시트를 뺀 곳)의 가운데와, 거기서 화면 모서리까지의 거리를 알린다
          const emitMoved = () => {
            const { onMoved: notify, bottomInset: bottom, topInset: top } = latest.current
            if (!notify) return
            const visibleHeight = Math.max(box.clientHeight - bottom - top, 80)
            const mid = map.getProjection().coordsFromContainerPoint(new maps.Point(box.clientWidth / 2, top + visibleHeight / 2))
            const corner = map.getProjection().coordsFromContainerPoint(new maps.Point(box.clientWidth, top))
            const center = { lat: mid.getLat(), lng: mid.getLng() }
            const radius = distanceMeters(center, { lat: corner.getLat(), lng: corner.getLng() })
            notify(center, Math.min(MAX_RADIUS, Math.max(MIN_RADIUS, radius)))
          }
          maps.event.addListener(map, 'dragend', emitMoved)
          maps.event.addListener(map, 'zoom_changed', () => {
            if (!ctx.quiet) emitMoved()
          })
          maps.event.addListener(map, 'click', () => latest.current.onSelect?.(null))
        } else {
          map.setDraggable(false)
          map.setZoomable(false)
        }

        // 화면 크기가 바뀌면 지도도 다시 맞춘다
        observer = new ResizeObserver(() => map.relayout())
        observer.observe(box)

        ctxRef.current = ctx
        setReady(true)
      })
      .catch(() => {
        if (!cancelled) latest.current.onFail()
      })

    return () => {
      cancelled = true
      observer?.disconnect()
      const ctx = ctxRef.current
      if (ctx) {
        window.clearTimeout(ctx.quietTimer)
        ctx.clusterer?.clear()
        ctx.markers.forEach((m) => m.setMap(null))
      }
      ctxRef.current = null
      box.replaceChildren()
    }
  }, [interactive])

  // 2) 매장 핀
  useEffect(() => {
    const ctx = ctxRef.current
    if (!ready || !ctx) return
    const { maps, map } = ctx
    ctx.clusterer?.clear()
    ctx.markers.forEach((m) => m.setMap(null))
    ctx.markers = new Map()

    for (const s of stores) {
      const marker = new maps.Marker({
        position: new maps.LatLng(s.latitude, s.longitude),
        image: ctx.images.normal,
        title: s.name,
        clickable: interactive,
      })
      if (interactive) maps.event.addListener(marker, 'click', () => latest.current.onSelect?.(s.storeId))
      ctx.markers.set(s.storeId, marker)
    }
    const markers = [...ctx.markers.values()]
    if (ctx.clusterer) ctx.clusterer.addMarkers(markers)
    else markers.forEach((m) => m.setMap(map))
  }, [ready, stores, interactive])

  // 3) 고른 매장: 핀을 키우고 이름을 띄운다
  useEffect(() => {
    const ctx = ctxRef.current
    if (!ready || !ctx) return
    ctx.markers.forEach((marker, id) => {
      const on = id === selectedId
      marker.setImage(on ? ctx.images.selected : ctx.images.normal)
      marker.setZIndex(on ? 10 : 1)
    })
    ctx.label?.setMap(null)
    ctx.label = null
    const picked = stores.find((s) => s.storeId === selectedId)
    if (picked) {
      ctx.label = new ctx.maps.CustomOverlay({
        position: new ctx.maps.LatLng(picked.latitude, picked.longitude),
        content: nameLabel(picked.name),
        xAnchor: 0.5,
        yAnchor: 1,
        zIndex: 20,
        map: ctx.map,
      })
    }
  }, [ready, stores, selectedId])

  // 4) 내 위치
  useEffect(() => {
    const ctx = ctxRef.current
    if (!ready || !ctx) return
    ctx.me?.setMap(null)
    ctx.me = me
      ? new ctx.maps.CustomOverlay({
          position: new ctx.maps.LatLng(me.lat, me.lng),
          content: meDot(),
          xAnchor: 0.5,
          yAnchor: 0.5,
          zIndex: 5,
          map: ctx.map,
        })
      : null
  }, [ready, me])

  // 5) 새로 찾았을 때 매장이 모두 보이게 맞춘다
  useEffect(() => {
    const ctx = ctxRef.current
    if (!ready || !ctx || fitKey == null || fittedRef.current === fitKey) return
    const { maps, map } = ctx

    const points = stores.map((s) => new maps.LatLng(s.latitude, s.longitude))
    if (anchor) points.push(new maps.LatLng(anchor.lat, anchor.lng))
    if (points.length === 0) return
    fittedRef.current = fitKey

    ctx.quiet = true
    window.clearTimeout(ctx.quietTimer)
    ctx.quietTimer = window.setTimeout(() => {
      ctx.quiet = false
    }, 800)

    if (points.length === 1) {
      map.setLevel(interactive ? 5 : 4)
      map.setCenter(points[0])
      // 시트와 검색창에 가려지지 않는 곳의 가운데로 옮긴다
      map.panBy(0, (bottomInset - topInset) / 2)
      return
    }
    const bounds = new maps.LatLngBounds()
    points.forEach((p) => bounds.extend(p))
    map.setBounds(bounds, topInset + 56, 40, bottomInset + 24, 40)
    if (map.getLevel() < CLOSEST_LEVEL) map.setLevel(CLOSEST_LEVEL)
  }, [ready, fitKey, stores, anchor, bottomInset, topInset, interactive])

  return <div ref={boxRef} role={interactive ? 'application' : 'img'} aria-label={label} className="absolute inset-0" />
}
