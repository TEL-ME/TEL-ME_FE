import { useEffect, useRef, useState } from 'react'
import { Maximize2 } from 'lucide-react'
import type { RouteStepType, StoreRoute } from '../../../api/stores'
import type { LatLng } from '../format'
import { hasKakaoKey, loadKakao } from '../kakao/loadKakao'
import type { KakaoBounds, KakaoMap, KakaoMaps, KakaoOverlay, KakaoPolyline } from '../kakao/types'
import { durationText, endLabels, stepPoints, stopNames } from './routeText'

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
  cleanups: (() => void)[]
  bounds?: KakaoBounds
}

interface RouteMapProps {
  origin: LatLng
  destination: LatLng
  route: StoreRoute | null
  /** 새 검색 결과에만 지도를 맞춘다. 경로·구간 선택과 도보 추가는 축척을 유지한다 */
  fitKey: number | string
  /**
   * 단계 목록에서 고른 구간 (route.steps의 번호). 있으면 그 구간에 맞춰 지도를 옮기고,
   * 그 선만 진하게 그린 뒤 타는 곳·내리는 곳을 표시한다. null이면 전체 경로
   */
  focusIndex?: number | null
  focusIndices?: number[]
  routes?: StoreRoute[]
  selectedIndex?: number
  onSelectRoute?: (index: number) => void
}

/**
 * 길찾기 경로 지도. 단계마다 따로 선을 그려, 좌표가 끊긴 곳을 실제 길처럼 잇지 않는다.
 * 카카오 지도 키가 없거나 불러오지 못하면 아무것도 그리지 않는다 (아래 단계 목록으로 안내).
 */
export default function RouteMap({ origin, destination, route, fitKey, focusIndex = null, focusIndices, routes, selectedIndex = 0, onSelectRoute }: RouteMapProps) {
  const boxRef = useRef<HTMLDivElement>(null)
  const ctxRef = useRef<Ctx | null>(null)
  const firstCenter = useRef(destination)
  const fitted = useRef<string | null>(null)
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(!hasKakaoKey)
  const onSelectRef = useRef(onSelectRoute)
  const focusKey = focusIndices?.join(',') ?? (focusIndex == null ? '' : String(focusIndex))
  useEffect(() => { onSelectRef.current = onSelectRoute }, [onSelectRoute])

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
        ctxRef.current = { maps, map, lines: [], overlays: [], cleanups: [] }
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
      ctx?.cleanups.forEach((cleanup) => cleanup())
      ctx?.lines.forEach((l) => l.setMap(null))
      ctx?.overlays.forEach((o) => o.setMap(null))
      ctxRef.current = null
    }
  }, [])

  useEffect(() => {
    const ctx = ctxRef.current
    if (!ready || !ctx) return
    const { maps, map } = ctx
    ctx.cleanups.forEach((cleanup) => cleanup())
    ctx.lines.forEach((l) => l.setMap(null))
    ctx.overlays.forEach((o) => o.setMap(null))
    ctx.lines = []
    ctx.overlays = []
    ctx.cleanups = []

    const bounds = new maps.LatLngBounds()
    const add = (p: LatLng) => {
      const ll = new maps.LatLng(p.lat, p.lng)
      bounds.extend(ll)
      return ll
    }

    const steps = route?.steps ?? []
    const focused = new Set((focusKey ? focusKey.split(',').map(Number) : []).filter((index) => steps[index] && stepPoints(steps[index]).length >= 2))

    // 대체 경로부터 그려 선택 경로가 항상 위에 보이게 한다. 누락된 구간은 잇지 않는다
    if (routes && routes.length > 1) routes.forEach((alternative, index) => {
      if (index === selectedIndex) return
      alternative.steps.forEach((step) => {
        const points = stepPoints(step)
        if (points.length < 2) return
        const line = new maps.Polyline({
          path: points.map((point) => add({ lat: point.latitude, lng: point.longitude })),
          strokeWeight: 5, strokeColor: '#77727a', strokeOpacity: focused.size ? 0.14 : 0.3,
          strokeStyle: step.type === 'WALK' ? 'shortdash' : 'solid', zIndex: 0,
        })
        line.setMap(map)
        ctx.lines.push(line)
        const select = () => onSelectRef.current?.(index)
        maps.event.addListener(line, 'click', select)
        ctx.cleanups.push(() => maps.event.removeListener(line, 'click', select))
      })
    })

    steps.forEach((step, i) => {
      const points = stepPoints(step)
      if (points.length < 2) return
      const style = STEP_STYLE[step.type] ?? STEP_STYLE.DRIVE
      const isFocus = focused.has(i)
      // 구간을 고르면 나머지 선은 흐리게 두어 고른 구간이 눈에 띄게 한다
      const line = new maps.Polyline({
        path: points.map((c) => {
          const ll = add({ lat: c.latitude, lng: c.longitude })
          return ll
        }),
        strokeWeight: isFocus ? 8 : 7,
        strokeColor: style.color,
        strokeOpacity: !focused.size || isFocus ? 0.95 : 0.25,
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
        // 도보 여러 단계를 고르면 묶음의 출발·도착만 표시해 이름표가 겹치지 않게 한다
        for (const o of [
          ...(i === Math.min(...focused) ? [boardDot, board] : []),
          ...(i === Math.max(...focused) ? [alightDot, alight] : []),
        ]) {
          o.setMap(map)
          ctx.overlays.push(o)
        }
      }
    })

    let west = Math.min(origin.lng, destination.lng)
    let east = Math.max(origin.lng, destination.lng)
    for (const candidate of routes ?? []) for (const step of candidate.steps) for (const point of stepPoints(step)) {
      west = Math.min(west, point.longitude)
      east = Math.max(east, point.longitude)
    }
    if (routes && routes.length > 1) routes.forEach((candidate, index) => {
      if (index !== selectedIndex || focused.size) return
      const points = candidate.steps.flatMap(stepPoints)
      if (!points.length) return
      const point = points[Math.floor(points.length / 2)]
      const badge = document.createElement('span')
      badge.textContent = `${index === 0 ? '추천' : `경로 ${index + 1}`} · ${durationText(candidate.durationSeconds)}`
      badge.setAttribute('aria-hidden', 'true')
      badge.style.cssText = 'padding:4px 7px;border-radius:10px;border:1px solid rgba(195,64,116,0.25);background:rgba(255,255,255,0.78);color:#6b696e;font-size:11px;font-weight:600;white-space:nowrap;pointer-events:none'
      const fraction = (point.longitude - west) / (east - west || 1)
      const xAnchor = fraction < 0.25 ? 0 : fraction > 0.75 ? 1 : 0.5
      const overlay = new maps.CustomOverlay({position: new maps.LatLng(point.latitude, point.longitude), content: badge, xAnchor, yAnchor: 1.3, zIndex: 6})
      overlay.setMap(map)
      ctx.overlays.push(overlay)
    })

    const start = new maps.CustomOverlay({ position: add(origin), content: dot('#6a4f8f'), zIndex: 3 })
    const end = new maps.CustomOverlay({ position: add(destination), content: dot('#c34074'), zIndex: 3 })
    start.setMap(map)
    end.setMap(map)
    ctx.overlays.push(start, end)

    ctx.bounds = bounds
    // 비동기로 도보가 추가되어도 사용자가 비교 중인 지도의 축척·위치를 유지한다
    const fitTarget = String(fitKey)
    if (fitted.current !== fitTarget) {
      fitted.current = fitTarget
      map.setBounds(bounds, 40, 40, 40, 40)
    }
  }, [ready, route, origin, destination, fitKey, focusKey, routes, selectedIndex])

  if (failed) return null
  return (
    <div className={`relative shrink-0 overflow-hidden rounded-card bg-surface-2 ${route?.mode === 'TRANSIT' ? 'h-[220px]' : 'h-[260px]'}`}>
      <div ref={boxRef} role="region" aria-label="출발지에서 매장까지 경로 지도" className="h-full w-full" />
      {ready && <button type="button" aria-label="전체 경로에 지도 맞추기" title="전체 경로에 지도 맞추기"
        onClick={() => { const ctx = ctxRef.current; if (ctx?.bounds) ctx.map.setBounds(ctx.bounds, 40, 40, 40, 40) }}
        className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-lg border border-[#dcd5da] bg-white/90 text-[#6b696e]">
        <Maximize2 size={16} aria-hidden />
      </button>}
    </div>
  )
}
