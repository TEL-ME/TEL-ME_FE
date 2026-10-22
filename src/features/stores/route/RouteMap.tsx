import { useEffect, useRef, useState } from 'react'
import type { RouteStepType, StoreRoute } from '../../../api/stores'
import type { LatLng } from '../format'
import { hasKakaoKey, loadKakao } from '../kakao/loadKakao'
import type { KakaoMap, KakaoMaps, KakaoOverlay, KakaoPolyline } from '../kakao/types'

// 지도 타일은 라이트 색뿐이라 테마와 상관없이 고정한다
const STEP_STYLE: Record<RouteStepType, { color: string; dashed?: boolean }> = {
  DRIVE: { color: '#c34074' },
  BICYCLE: { color: '#c34074' },
  BUS: { color: '#1c6e59' },
  SUBWAY: { color: '#2a5f9e' },
  WALK: { color: '#77727a', dashed: true },
}

function dot(color: string): HTMLElement {
  const el = document.createElement('div')
  el.setAttribute('aria-hidden', 'true')
  el.style.cssText = `width:16px;height:16px;border-radius:50%;background:${color};border:3px solid #fff;box-shadow:0 2px 6px rgba(43,38,45,0.3);pointer-events:none`
  return el
}

interface Ctx {
  maps: KakaoMaps
  map: KakaoMap
  lines: KakaoPolyline[]
  overlays: KakaoOverlay[]
}

interface RouteMapProps {
  origin: LatLng
  destination: LatLng
  route: StoreRoute | null
  /** 새 결과가 올 때만 바뀐다. 이때만 경로에 맞춰 지도를 옮기고, 그 뒤 사용자가 옮긴 지도는 덮어쓰지 않는다 */
  fitKey: number
}

/**
 * 길찾기 경로 지도. 단계마다 따로 선을 그려, 좌표가 끊긴 곳을 실제 길처럼 잇지 않는다.
 * 카카오 지도 키가 없거나 불러오지 못하면 아무것도 그리지 않는다 (아래 단계 목록으로 안내).
 */
export default function RouteMap({ origin, destination, route, fitKey }: RouteMapProps) {
  const boxRef = useRef<HTMLDivElement>(null)
  const ctxRef = useRef<Ctx | null>(null)
  const firstCenter = useRef(destination)
  const fitted = useRef<number | null>(null)
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(!hasKakaoKey)

  useEffect(() => {
    if (!hasKakaoKey) return
    const box = boxRef.current
    if (!box) return
    let cancelled = false
    let observer: ResizeObserver | undefined
    loadKakao()
      .then((maps) => {
        if (cancelled) return
        const center = firstCenter.current
        const map = new maps.Map(box, { center: new maps.LatLng(center.lat, center.lng), level: 5 })
        ctxRef.current = { maps, map, lines: [], overlays: [] }
        if (typeof ResizeObserver !== 'undefined') {
          observer = new ResizeObserver(() => map.relayout())
          observer.observe(box)
        }
        setReady(true)
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
      observer?.disconnect()
      const ctx = ctxRef.current
      ctx?.lines.forEach((l) => l.setMap(null))
      ctx?.overlays.forEach((o) => o.setMap(null))
      ctxRef.current = null
    }
  }, [])

  useEffect(() => {
    const ctx = ctxRef.current
    if (!ready || !ctx) return
    const { maps, map } = ctx
    ctx.lines.forEach((l) => l.setMap(null))
    ctx.overlays.forEach((o) => o.setMap(null))
    ctx.lines = []
    ctx.overlays = []

    const bounds = new maps.LatLngBounds()
    const add = (p: LatLng) => {
      const ll = new maps.LatLng(p.lat, p.lng)
      bounds.extend(ll)
      return ll
    }

    for (const step of route?.steps ?? []) {
      const points = step.path.filter((c) => Number.isFinite(c.latitude) && Number.isFinite(c.longitude))
      if (points.length < 2) continue
      const style = STEP_STYLE[step.type] ?? STEP_STYLE.DRIVE
      const line = new maps.Polyline({
        path: points.map((c) => add({ lat: c.latitude, lng: c.longitude })),
        strokeWeight: 6,
        strokeColor: style.color,
        strokeOpacity: 0.9,
        strokeStyle: style.dashed ? 'shortdash' : 'solid',
      })
      line.setMap(map)
      ctx.lines.push(line)
    }

    const start = new maps.CustomOverlay({ position: add(origin), content: dot('#6a4f8f'), zIndex: 3 })
    const end = new maps.CustomOverlay({ position: add(destination), content: dot('#c34074'), zIndex: 3 })
    start.setMap(map)
    end.setMap(map)
    ctx.overlays.push(start, end)

    if (fitted.current !== fitKey) {
      fitted.current = fitKey
      map.setBounds(bounds, 40, 40, 40, 40)
    }
  }, [ready, route, origin, destination, fitKey])

  if (failed) return null
  return (
    <div className="relative h-[260px] shrink-0 overflow-hidden rounded-card bg-surface-2">
      <div ref={boxRef} role="img" aria-label="출발지에서 매장까지 경로 지도" className="h-full w-full" />
    </div>
  )
}
