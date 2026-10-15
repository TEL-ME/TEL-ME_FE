import { ChevronLeft, ChevronRight, CirclePause, RotateCw } from 'lucide-react'
import { useState } from 'react'
import { ApiError } from '../../../api/client'
import type { MonthUsage, ResourceUsage } from '../../../api/plans'
import { barPercent, formatAmount, monthLabel, overAmount, shiftMonth, toMonthKey, type UsageKind } from '../format'
import { useUsage } from '../queries'

const KIND: Record<UsageKind, { label: string; chip: string; bar: string }> = {
  data: { label: '데이터', chip: 'bg-chip-roam-bg text-chip-roam', bar: 'from-[#8fb6ec] to-[#2a5f9e]' },
  voice: { label: '통화', chip: 'bg-chip-plan-bg text-chip-plan', bar: 'from-[#9fd9c7] to-[#1c6e59]' },
  sms: { label: '문자', chip: 'bg-chip-usim-bg text-chip-usim', bar: 'from-[#cbb3ee] to-[#6b3aad]' },
}

/** 사용량 한 칸: 남은 양 · 무제한 · 초과를 구분해 보여 준다 */
export function UsageCard({ kind, usage, wide = false }: { kind: UsageKind; usage: ResourceUsage; wide?: boolean }) {
  const k = KIND[kind]
  const amount = (n: number) => formatAmount(kind, n)
  const headline = usage.unlimited
    ? `${amount(usage.used)} 사용`
    : usage.exceeded
      ? `${amount(overAmount(usage))} 초과`
      : `${amount(usage.remaining ?? 0)} 남음`
  const sub = usage.unlimited ? '무제한' : `기본 ${amount(usage.limit ?? 0)} 중`

  return (
    <div className={`flex min-w-0 flex-col gap-2 rounded-card bg-surface px-4 pb-4 pt-3.5 ${wide ? 'col-span-2' : ''}`}>
      <div className="flex items-center gap-2">
        <span className={`rounded-lg px-2 py-[3px] text-xs font-bold ${k.chip}`}>{k.label}</span>
        {usage.exceeded && (
          <span className="rounded-lg border border-danger px-2 py-[2px] text-xs font-bold text-danger">한도 초과</span>
        )}
      </div>
      <p className="text-[13px] leading-[18px] text-ink-sub">{sub}</p>
      <p
        className={`font-extrabold leading-[1.25] tracking-[-0.6px] ${wide ? 'text-[26px]' : 'text-[clamp(18px,5vw,22px)]'} ${
          usage.exceeded ? 'text-danger' : 'text-ink'
        }`}
      >
        {headline}
      </p>
      {usage.unlimited ? (
        <p className="text-xs leading-4 text-ink-sub">무제한 요금제라 남은 양을 따로 세지 않아요</p>
      ) : (
        <>
          <div
            role="progressbar"
            aria-label={`${k.label} 사용률`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={barPercent(usage)}
            className="h-2 overflow-hidden rounded-full bg-surface-2"
          >
            <div
              className={`h-full rounded-full ${usage.exceeded ? 'bg-danger' : `bg-gradient-to-r ${k.bar}`}`}
              style={{ width: `${barPercent(usage)}%` }}
            />
          </div>
          <p className={`-mt-0.5 text-right text-xs ${usage.exceeded ? 'font-bold text-danger' : 'text-ink-sub'}`}>
            {usage.percent ?? 0}% 사용{usage.exceeded ? ` · ${amount(usage.used)} 씀` : ''}
          </p>
        </>
      )}
    </div>
  )
}

function UsageGrid({ usage }: { usage: MonthUsage }) {
  return (
    <div className="grid grid-cols-2 gap-2.5">
      <UsageCard kind="data" usage={usage.data} wide />
      <UsageCard kind="voice" usage={usage.voice} />
      <UsageCard kind="sms" usage={usage.sms} />
    </div>
  )
}

const navButton =
  'flex h-9 w-9 items-center justify-center rounded-full bg-surface text-ink disabled:bg-transparent disabled:text-ink-muted disabled:opacity-50'

/**
 * 월별 사용량. ◀ ▶로 조회 가능한 범위(availableFrom~availableTo) 안에서만 옮긴다.
 * 이번 달은 정산일까지 남은 일수·일시 정지 표시가 붙고, 지난 달은 사용량만 보인다
 */
export default function UsageSection() {
  // null이면 이번 달 (서버가 정한 이번 달을 따른다)
  const [month, setMonth] = useState<string | null>(null)
  const query = useUsage(month)
  const data = query.data
  const usage = data?.status === 'ACTIVE' ? data.usage : null
  const shown = usage ? toMonthKey(usage.month) : null
  const from = data?.availableFrom ? toMonthKey(data.availableFrom) : null
  const to = data?.availableTo ? toMonthKey(data.availableTo) : null
  const isThisMonth = shown != null && shown === to

  const go = (delta: number) => {
    if (!shown) return
    const next = shiftMonth(shown, delta)
    setMonth(next === to ? null : next)
  }

  // 미가입·개통 전은 위 프로필 카드에서 안내한다
  if (data && data.status !== 'ACTIVE') return null

  return (
    <section className="flex flex-col gap-2.5" aria-busy={query.isFetching}>
      <div className="flex items-center gap-2">
        <h2 className="min-w-0 flex-1 text-[17px] font-extrabold tracking-[-0.3px]">
          {shown == null || isThisMonth ? '이번 달 사용량' : `${monthLabel(shown)} 사용량`}
        </h2>
        {shown && (
          <div className="flex items-center gap-1">
            <button type="button" aria-label="이전 달" disabled={!from || shown <= from} onClick={() => go(-1)} className={navButton}>
              <ChevronLeft size={18} strokeWidth={2.2} aria-hidden />
            </button>
            <span className="min-w-[78px] text-center text-[13px] font-semibold text-ink-sub">{monthLabel(shown)}</span>
            <button type="button" aria-label="다음 달" disabled={!to || shown >= to} onClick={() => go(1)} className={navButton}>
              <ChevronRight size={18} strokeWidth={2.2} aria-hidden />
            </button>
          </div>
        )}
      </div>

      {usage && isThisMonth && (usage.daysUntilBilling != null || usage.paused) && (
        <div className="flex flex-wrap gap-1.5">
          {usage.daysUntilBilling != null && (
            <span className="rounded-full bg-surface px-2.5 py-1 text-xs font-semibold text-ink-sub">
              {usage.daysUntilBilling === 0 ? '오늘 정산돼요' : `정산일까지 ${usage.daysUntilBilling}일`}
            </span>
          )}
          {usage.paused && (
            <span className="flex items-center gap-1 rounded-full bg-notice px-2.5 py-1 text-xs font-bold text-notice-text">
              <CirclePause size={13} strokeWidth={2.2} aria-hidden />
              일시 정지 중
            </span>
          )}
        </div>
      )}

      {query.isError && !usage ? (
        <div className="flex items-center gap-3 rounded-card bg-surface p-4">
          <p className="min-w-0 flex-1 text-sm leading-5 text-ink-sub">
            {query.error instanceof ApiError ? query.error.message : '사용량을 불러오지 못했어요.'}
          </p>
          <button
            type="button"
            onClick={() => (month ? setMonth(null) : void query.refetch())}
            className="flex min-h-9 shrink-0 items-center gap-1 rounded-full bg-surface-2 px-3 text-[13px] font-bold text-ink"
          >
            <RotateCw size={14} strokeWidth={2} aria-hidden />
            {month ? '이번 달 보기' : '다시 시도'}
          </button>
        </div>
      ) : usage ? (
        <>
          <UsageGrid usage={usage} />
          {!isThisMonth && <p className="px-1 text-xs leading-4 text-ink-muted">지난 달은 사용량만 보여요.</p>}
        </>
      ) : (
        <div aria-hidden className="grid grid-cols-2 gap-2.5">
          <div className="tm-pulse col-span-2 h-[150px] rounded-card bg-surface" />
          <div className="tm-pulse h-[150px] rounded-card bg-surface" />
          <div className="tm-pulse h-[150px] rounded-card bg-surface" />
        </div>
      )}
    </section>
  )
}
