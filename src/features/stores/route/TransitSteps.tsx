import { Bus, Footprints, TrainFront } from 'lucide-react'
import type { RouteStep } from '../../../api/stores'
import { formatDistance } from '../format'
import { durationText, groupTransitSteps, isFocusable, STEP_LABEL, stopNames } from './routeText'

interface TransitStepsProps {
  steps: RouteStep[]
  focusedIndices: number[]
  onSelect: (indices: number[]) => void
}

/** 연속 도보는 한 줄로 묶고 상세만 접는다. 원본 단계 좌표는 그대로 유지한다 */
export default function TransitSteps({ steps, focusedIndices, onSelect }: TransitStepsProps) {
  return (
    <ol aria-label="단계별 안내" className="mt-2 divide-y divide-surface-2">
      {groupTransitSteps(steps).map((group) => {
        const step = group.steps[0]
        const walk = step.type === 'WALK'
        const Icon = walk ? Footprints : step.type === 'SUBWAY' ? TrainFront : Bus
        const focusable = group.indices.filter((index) => isFocusable(steps[index]))
        const selected = focusable.length > 0 && focusable.every((index) => focusedIndices.includes(index))
        const stops = stopNames(step)
        const title = walk ? '도보' : `${STEP_LABEL[step.type]}${step.lineName ? ` ${step.lineName}` : ''}`
        const meta = `${durationText(group.steps.reduce((sum, item) => sum + item.durationSeconds, 0))} · ${formatDistance(group.steps.reduce((sum, item) => sum + item.distanceMeters, 0))}`
        const body = <>
          <Icon size={16} className={`mt-0.5 shrink-0 ${selected ? 'text-brand-text' : 'text-ink-muted'}`} aria-hidden />
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
              <span className="text-[13px] font-bold">{title}</span>
              <span className="text-xs text-ink-sub">{meta}</span>
            </span>
            {!walk && (stops || step.guidance) && <span className="mt-0.5 block truncate text-xs text-ink-sub" title={step.guidance ?? undefined}>{stops ? `${stops.from} → ${stops.to}` : step.guidance}</span>}
          </span>
        </>
        return (
          <li key={group.indices[0]} className="py-1">
            {focusable.length ? (
              <button type="button" aria-pressed={selected} aria-label={`${title} ${meta}, 지도에서 보기`}
                onClick={() => onSelect(focusable)}
                className={`flex min-h-11 w-full items-start gap-2 rounded-xl px-2 py-2 text-left ${selected ? 'bg-brand-soft' : 'hover:bg-surface-2'}`}>{body}</button>
            ) : <div className="flex min-h-11 items-start gap-2 px-2 py-2">{body}</div>}
            {walk && (group.steps.length > 1 || group.steps.some((item) => item.guidance || isFocusable(item))) && (
              <details className="pb-1 pl-8 text-xs text-ink-sub">
                <summary className="cursor-pointer py-1">도보 상세{group.steps.length > 1 ? ` ${group.steps.length}개` : ''}</summary>
                <ol className="mt-1 flex list-decimal flex-col gap-2 pl-4 leading-5">
                  {group.steps.map((item, i) => {
                    const index = group.indices[i]
                    const focused = focusedIndices.length === 1 && focusedIndices[0] === index
                    return (
                      <li key={index}>
                        {item.guidance ?? '도보로 이동'}{' '}
                        <span className="text-ink-muted">({durationText(item.durationSeconds)} · {formatDistance(item.distanceMeters)})</span>
                        {isFocusable(item) && <button type="button" aria-pressed={focused}
                          aria-label={`${item.guidance ?? `도보 ${i + 1}구간`} ${focused ? '전체 경로 보기' : '지도에서 보기'}`}
                          onClick={() => onSelect([index])}
                          className="ml-1 inline-flex min-h-8 items-center rounded-lg px-1.5 font-semibold text-brand-text hover:bg-brand-soft">
                          {focused ? '전체 경로 보기' : '지도에서 보기'}
                        </button>}
                      </li>
                    )
                  })}
                </ol>
              </details>
            )}
          </li>
        )
      })}
    </ol>
  )
}
