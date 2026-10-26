import { useEffect, useId, useRef } from 'react'
import type { StoreRoute } from '../../../api/stores'
import { durationText, fareText, transfersText } from './routeText'

interface RouteAlternativesProps {
  routes: StoreRoute[]
  selectedIndex: number
  onSelect: (index: number) => void
}

/** 지도 아래에서 높이를 늘리지 않고 비교한다. 라디오 기본 방향키 선택도 유지한다 */
export default function RouteAlternatives({ routes, selectedIndex, onSelect }: RouteAlternativesProps) {
  const name = useId()
  const listRef = useRef<HTMLDivElement>(null)
  const selectedRef = useRef<HTMLLabelElement>(null)
  useEffect(() => {
    const list = listRef.current
    const label = selectedRef.current
    if (!list || !label) return
    const left = label.offsetLeft
    const right = left + label.offsetWidth
    if (left < list.scrollLeft || right > list.scrollLeft + list.clientWidth) {
      list.scrollTo({ left: Math.max(0, left - 4), behavior: 'smooth' })
    }
  }, [selectedIndex])
  return (
    <fieldset className="min-w-0 shrink-0">
      <legend className="sr-only">경로 선택</legend>
      <div className="flex items-center justify-between px-1 pb-1.5 text-xs text-ink-sub" aria-hidden>
        <span className="font-bold">경로 {routes.length}개</span>
        <span>좌우로 비교</span>
      </div>
      <div ref={listRef} className="no-scrollbar relative flex gap-2 overflow-x-auto pb-1">
        {routes.map((route, index) => {
          const selected = selectedIndex === index
          return (
            <label key={index} ref={selected ? selectedRef : undefined} className={`flex min-w-[148px] shrink-0 cursor-pointer gap-2 rounded-2xl px-3 py-2.5 ${selected ? 'bg-brand-soft ring-1 ring-inset ring-brand' : 'bg-surface'}`}>
              <input type="radio" name={name} value={index} checked={selected} onChange={() => onSelect(index)}
                aria-label={index === 0 ? '추천 경로' : `다른 경로 ${index}`}
                className="mt-1 h-3.5 w-3.5 shrink-0 accent-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand" />
              <span className="flex flex-col gap-1">
                <span className="flex items-baseline gap-2">
                  <span className={`text-xs font-bold ${selected ? 'text-brand-text' : 'text-ink-sub'}`}>{index === 0 ? '추천' : `경로 ${index + 1}`}</span>
                  <span className="text-[15px] font-extrabold">{durationText(route.durationSeconds)}</span>
                </span>
                <span className="text-xs text-ink-sub">{[transfersText(route.transfers), fareText(route.fare)].filter(Boolean).join(' · ')}</span>
              </span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
