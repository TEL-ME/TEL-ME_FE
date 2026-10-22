import { useEffect, useRef, useState } from 'react'
import type { RouteStepType, StoreRoute } from '../../../api/stores'
import type { LatLng } from '../format'
import { hasKakaoKey, loadKakao } from '../kakao/loadKakao'
import type { KakaoMap, KakaoMaps, KakaoOverlay, KakaoPolyline } from '../kakao/types'
import { endLabels, stepPoints, stopNames } from './routeText'

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

/** 고른 구간의 타는 곳·내리는 곳 이름표 (글자는 textContent로만 넣는다) */
function stopLabel(kind: string, name: string | null, color: string): HTMLElement {
  const el = document.createElement('div')
  el.style.cssText = `display:flex;align-items:center;gap:4px;max-width:180px;padding:4px 8px;border-radius:999px;background:#fff;border:2px solid ${color};box-shadow:0 2px 6px rgba(43,38,45,0.25);font-size:12px;line-height:16px;color:#2b262d;white-space:nowrap;pointer-events:none`
  const tag = document.createElement('span')
  tag.textContent = kind
  tag.style.cssText = `font-weight:800;color:${color};flex-shrink:0`
  el.appendChild(tag)
  if (name) {
    const text = document.createElement('span')
    text.textContent = name
    text.style.cssText = 'overflow:hidden;text-overflow:ellipsis;font-weight:600'
    el.appendChild(text)
  }
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
  /**
   * 단계 목록에서 고른 구간 (route.steps의 번호). 있으면 그 구간에 맞춰 지도를 옮기고,
   * 그 선만 진하게 그린 뒤 타는 곳·내리는 곳을 표시한다. null이면 전체 경로
   */
  focusIndex?: number | null
}

/**
 * 길찾기 경로 지도. 단계마다 따로 선을 그려, 좌표가 끊긴 곳을 실제 길처럼 잇지 않는다.
 * 카카오 지도 키가 없거나 불러오지 못하면 아무것도 그리지 않는다 (아래 단계 목록으로 안내).
 */
export default function RouteMap({ origin, destination, route, fitKey, focusIndex = null }: RouteMapProps) {
  const boxRef = useRef<HTMLDivElement>(null)
  const ctxRef = useRef<Ctx | null>(null)
  const firstCenter = useRef(destination)
  const fitted = useRef<string | null>(null)
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
    const focusBounds = new maps.LatLngBounds()
    const add = (p: LatLng) => {
      const ll = new maps.LatLng(p.lat, p.lng)
      bounds.extend(ll)
      return ll
    }

    const steps = route?.steps ?? []
    const focusStep = focusIndex != null ? steps[focusIndex] : undefined
    // 좌표가 없는 구간은 고를 수 없게 막지만, 혹시 와도 전체 경로를 보여 준다
    const focused = focusStep && stepPoints(focusStep).length >= 2 ? focusIndex : null

    steps.forEach((step, i) => {
      const points = stepPoints(step)
      if (points.length < 2) return
      const style = STEP_STYLE[step.type] ?? STEP_STYLE.DRIVE
      const isFocus = i === focused
      // 구간을 고르면 나머지 선은 흐리게 두어 고른 구간이 눈에 띄게 한다
      const line = new maps.Polyline({
        path: points.map((c) => {
          const ll = add({ lat: c.latitude, lng: c.longitude })
          if (isFocus) focusBounds.extend(ll)
          return ll
        }),
        strokeWeight: isFocus ? 8 : 6,
        strokeColor: style.color,
        strokeOpacity: focused == null || isFocus ? 0.9 : 0.25,
        strokeStyle: style.dashed ? 'shortdash' : 'solid',
        zIndex: isFocus ? 2 : 1,
      })
      line.setMap(map)
      ctx.lines.push(line)

      if (isFocus) {
        const first = points[0]
        const last = points[points.length - 1]
        // 정류장 이름은 버스·지하철 안내 문구에만 있다
        const names = stopNames(step)
        const labels = endLabels(step)
        const board = new maps.CustomOverlay({
          position: new maps.LatLng(first.latitude, first.longitude),
          content: stopLabel(labels.start, names?.from ?? null, style.color),
          yAnchor: 1.4,
          zIndex: 5,
        })
        const alight = new maps.CustomOverlay({
          position: new maps.LatLng(last.latitude, last.longitude),
          content: stopLabel(labels.end, names?.to ?? null, style.color),
          yAnchor: 1.4,
          zIndex: 5,
        })
        const boardDot = new maps.CustomOverlay({ position: new maps.LatLng(first.latitude, first.longitude), content: dot(style.color), zIndex: 4 })
        const alightDot = new maps.CustomOverlay({ position: new maps.LatLng(last.latitude, last.longitude), content: dot(style.color), zIndex: 4 })
        for (const o of [boardDot, alightDot, board, alight]) {
          o.setMap(map)
          ctx.overlays.push(o)
        }
      }
    })

    const start = new maps.CustomOverlay({ position: add(origin), content: dot('#6a4f8f'), zIndex: 3 })
    const end = new maps.CustomOverlay({ position: add(destination), content: dot('#c34074'), zIndex: 3 })
    start.setMap(map)
    end.setMap(map)
    ctx.overlays.push(start, end)

    // 새 결과가 오거나 고른 구간이 바뀔 때만 지도를 옮긴다 (그 사이 사용자가 옮긴 지도는 그대로 둔다)
    const fitTarget = `${fitKey}:${focused ?? 'all'}`
    if (fitted.current !== fitTarget) {
      fitted.current = fitTarget
      // 이름표가 잘리지 않게 고른 구간은 여백을 넉넉히 둔다
      if (focused != null) map.setBounds(focusBounds, 56, 48, 40, 48)
      else map.setBounds(bounds, 40, 40, 40, 40)
    }
  }, [ready, route, origin, destination, fitKey, focusIndex])

  if (failed) return null
  return (
    <div className="relative h-[260px] shrink-0 overflow-hidden rounded-card bg-surface-2">
      <div ref={boxRef} role="img" aria-label="출발지에서 매장까지 경로 지도" className="h-full w-full" />
    </div>
  )
}
