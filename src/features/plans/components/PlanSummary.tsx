import type { Plan } from '../../../api/plans'
import { NETWORK_LABEL, TARGET_LABEL, planAllowance, won } from '../format'

/** 망·대상 표시 (일반 요금제는 대상 표시를 생략) */
export function PlanTags({ plan }: { plan: Plan }) {
  return (
    <span className="flex gap-1">
      <span className="rounded-md bg-chip-roam-bg px-1.5 py-[2px] text-[11px] font-bold text-chip-roam">
        {NETWORK_LABEL[plan.networkType]}
      </span>
      {plan.targetGroup !== 'GENERAL' && (
        <span className="rounded-md bg-chip-store-bg px-1.5 py-[2px] text-[11px] font-bold text-chip-store">
          {TARGET_LABEL[plan.targetGroup]}
        </span>
      )}
    </span>
  )
}

/** 데이터 · 통화 · 문자 기본 제공량 */
export function PlanAllowance({ plan }: { plan: Plan }) {
  const a = planAllowance(plan)
  return (
    <dl className="m-0 grid grid-cols-3 gap-1.5">
      {[
        ['데이터', a.data],
        ['통화', a.voice],
        ['문자', a.sms],
      ].map(([label, value]) => (
        <div key={label} className="flex flex-col gap-0.5 rounded-xl bg-surface-2 px-2.5 py-2">
          <dt className="text-[11px] font-semibold leading-[14px] text-ink-muted">{label}</dt>
          <dd className={`m-0 text-sm font-bold leading-5 ${value === '무제한' ? 'text-brand-text' : 'text-ink'}`}>{value}</dd>
        </div>
      ))}
    </dl>
  )
}

/** 요금제 이름 + 월정액 (+ 기본 제공량) */
export function PlanSummary({ plan, showAllowance = true }: { plan: Plan; showAllowance?: boolean }) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-start gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <PlanTags plan={plan} />
          <strong className="break-keep text-[17px] font-extrabold leading-6">{plan.name}</strong>
        </div>
        <span className="shrink-0 text-right text-[17px] font-extrabold leading-6">
          {won(plan.monthlyFee)}
          <span className="block text-[11px] font-semibold text-ink-muted">월정액</span>
        </span>
      </div>
      {showAllowance && <PlanAllowance plan={plan} />}
    </div>
  )
}
