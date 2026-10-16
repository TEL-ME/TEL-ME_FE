import type { StageCell as Cell } from '../../../api/adminMonitoring'
import { stateStyle } from './stages'

/** 표의 단계 칸: 색 점 + 짧은 글(없으면 상태 이름). 진행 중 칸은 점이 깜빡인다 */
export default function StageCell({ cell, title, compact = false }: { cell: Cell | undefined; title: string; compact?: boolean }) {
  const state = cell?.state ?? 'SKIPPED'
  const s = stateStyle(state)
  const text = cell?.label ?? (state === 'SKIPPED' ? '–' : s.name)
  // 좁을 때(상세 패널을 연 표): 점만, 글은 툴팁으로
  if (compact) {
    return (
      <span title={`${title}: ${s.name}${cell?.label ? ` · ${cell.label}` : ''}`} className="flex h-7 items-center justify-center">
        <span aria-hidden className={`h-3 w-3 rounded-full ${s.dot} ${state === 'RUNNING' ? 'animate-pulse' : ''}`} />
        <span className="sr-only">
          {title} {s.name} {cell?.label ?? ''}
        </span>
      </span>
    )
  }
  return (
    <span
      title={`${title}: ${s.name}${cell?.label ? ` · ${cell.label}` : ''}`}
      className={`flex h-7 min-w-0 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold ${s.cell}`}
    >
      <span aria-hidden className={`h-2 w-2 shrink-0 rounded-full ${s.dot} ${state === 'RUNNING' ? 'animate-pulse' : ''}`} />
      <span className="truncate">{text}</span>
      <span className="sr-only">({s.name})</span>
    </span>
  )
}
