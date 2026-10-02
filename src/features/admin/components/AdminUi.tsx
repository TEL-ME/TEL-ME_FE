import { ChevronDown } from 'lucide-react'
import type { ReactNode } from 'react'

/** 관리자 화면 공통 조각 (팀원 관리자 시안 기준) */

export function PageHeader({ title, desc, actions }: { title: ReactNode; desc?: string; actions?: ReactNode }) {
  return (
    <header className="flex items-end gap-4">
      <div className="flex flex-1 flex-col gap-1">
        <h1 className="text-[26px] font-extrabold leading-[34px] tracking-[-0.5px]">{title}</h1>
        {desc && <p className="text-sm text-ink-sub">{desc}</p>}
      </div>
      {actions}
    </header>
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`overflow-hidden rounded-card border-[1.5px] border-line bg-surface ${className}`}>{children}</div>
}

interface SelectProps<T extends string> {
  label: string
  value: T
  options: readonly (readonly [T, string])[]
  onChange: (v: T) => void
}

export function FilterSelect<T extends string>({ label, value, options, onChange }: SelectProps<T>) {
  return (
    <label className="flex items-center gap-2 text-[13px] font-bold text-ink-sub">
      {label}
      <span className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value as T)}
          className="h-[34px] appearance-none rounded-[10px] border-[1.5px] border-line bg-surface pl-3 pr-8 text-[13px] font-semibold text-ink outline-none focus:border-brand"
        >
          {options.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        <ChevronDown size={14} aria-hidden className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-sub" />
      </span>
    </label>
  )
}

export function Chip({ on, children, onClick }: { on: boolean; children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`h-[34px] whitespace-nowrap rounded-full border-[1.5px] px-3.5 text-[13px] ${
        on ? 'border-brand bg-brand-soft font-bold text-brand-strong' : 'border-line bg-surface font-medium text-ink-sub'
      }`}
    >
      {children}
    </button>
  )
}

export function Badge({ tone, children }: { tone: 'brand' | 'muted' | 'success' | 'notice' | 'danger'; children: ReactNode }) {
  const cls = {
    brand: 'bg-brand-soft text-brand-strong',
    muted: 'bg-surface-2 text-ink-sub',
    success: 'bg-chip-plan-bg text-chip-plan',
    notice: 'bg-notice text-notice-text',
    danger: 'bg-brand-soft text-danger',
  }[tone]
  return <span className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-bold ${cls}`}>{children}</span>
}

export function Pager({ page, totalPages, total, unit, onPage }: { page: number; totalPages: number; total: number; unit: string; onPage: (p: number) => void }) {
  return (
    <div className="flex items-center justify-between px-5 py-3 text-[13px] text-ink-sub">
      <span>
        총 {total.toLocaleString()}
        {unit}
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={page <= 0}
          onClick={() => onPage(page - 1)}
          className="h-8 rounded-[10px] border-[1.5px] border-line px-3 font-semibold text-ink disabled:opacity-40"
        >
          이전
        </button>
        <span>
          {totalPages === 0 ? 0 : page + 1} / {totalPages}
        </span>
        <button
          type="button"
          disabled={page + 1 >= totalPages}
          onClick={() => onPage(page + 1)}
          className="h-8 rounded-[10px] border-[1.5px] border-line px-3 font-semibold text-ink disabled:opacity-40"
        >
          다음
        </button>
      </div>
    </div>
  )
}

export function TableHead({ cols, children }: { cols: string; children: ReactNode }) {
  return (
    <div className="grid h-[42px] items-center gap-x-4 bg-surface-2 px-5 text-xs font-bold text-ink-muted" style={{ gridTemplateColumns: cols }}>
      {children}
    </div>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="px-5 py-12 text-center text-sm text-ink-sub">{children}</p>
}

export const primaryBtn =
  'inline-flex h-11 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-[14px] bg-brand px-[18px] text-[15px] font-bold text-white disabled:opacity-50'
export const secondaryBtn =
  'inline-flex h-11 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-[14px] border-[1.5px] border-line bg-surface px-[18px] text-[15px] font-bold text-ink disabled:opacity-50'
