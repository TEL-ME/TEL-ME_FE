import { Check, TriangleAlert } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ApiError } from '../api/client'
import { subscriptionApi, type NetworkType, type Plan, type TargetGroup } from '../api/plans'
import TextField from '../components/TextField'
import { ErrorBox, PlanFrame, RequireLogin } from '../features/plans/components/PlanFrame'
import { PlanSummary } from '../features/plans/components/PlanSummary'
import {
  CONTRACT_DISCOUNT_PERCENT,
  CONTRACT_MONTHS,
  NETWORK_LABEL,
  TARGET_LABEL,
  contractDiscount,
  exceededWarning,
  formatDate,
  needsBirthDate,
  won,
} from '../features/plans/format'
import { refreshSubscription, usePlans, useSubscription, useUsage } from '../features/plans/queries'
import { useDragScroll } from '../lib/useDragScroll'
import { showToast } from '../stores/toastStore'

const chip = (on: boolean) =>
  `min-h-9 shrink-0 rounded-full border-[1.5px] px-3.5 text-[13px] ${
    on ? 'border-brand bg-brand-soft font-bold text-brand-strong' : 'border-surface bg-surface font-medium text-ink'
  }`

const NETWORKS: (NetworkType | null)[] = [null, 'FIVE_G', 'LTE', 'BUDGET']
const TARGETS: (TargetGroup | null)[] = [null, 'GENERAL', 'YOUTH', 'SENIOR']

/**
 * 요금제 고르기. 가입하지 않았으면 가입, 가입 중이면 변경 화면이 된다.
 * 청소년·시니어 요금제는 생년월일을 받고, 가입할 때만 약정(24개월) 선택이 있다
 */
export default function PlanSelectPage() {
  const sub = useSubscription()
  const changing = sub.data?.subscribed === true
  return (
    <PlanFrame title={changing ? '요금제 변경' : '요금제 가입'} fallback={changing ? '/my/plan' : '/my'}>
      <RequireLogin>
        <PlanSelect />
      </RequireLogin>
    </PlanFrame>
  )
}

function PlanSelect() {
  const navigate = useNavigate()
  // 필터 칩 줄을 PC 마우스로도 끌어서 넘긴다
  const networkDrag = useDragScroll<HTMLDivElement>()
  const targetDrag = useDragScroll<HTMLDivElement>()
  const sub = useSubscription()
  const [networkType, setNetworkType] = useState<NetworkType | null>(null)
  const [targetGroup, setTargetGroup] = useState<TargetGroup | null>(null)
  const plans = usePlans({ networkType: networkType ?? undefined, targetGroup: targetGroup ?? undefined })
  const [picked, setPicked] = useState<Plan | null>(null)
  // 채팅의 요금제 링크에서 왔으면(?planId=) 그 요금제를 고른 채로 연다. 직접 고르면 그 선택을 따른다
  const [params] = useSearchParams()
  const presetId = Number(params.get('planId')) || null
  const [touched, setTouched] = useState(false)
  const presetRef = useRef<HTMLLIElement>(null)
  // 변경할 때 이번 달 사용량이 고른 요금제 한도를 넘는지 보여 주려고 읽는다
  const usage = useUsage(null)
  const [contract, setContract] = useState(false)
  const [birthDate, setBirthDate] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const current = sub.data?.subscription
  const changing = sub.data?.subscribed === true
  // 변경할 때 지금 요금제(개통 전이면 개통 예정 요금제)는 고를 수 없다
  const currentPlanId = current?.currentPlan?.planId ?? current?.pendingActivation?.plan.planId ?? null
  const preset =
    !touched && presetId != null && !(changing && presetId === currentPlanId)
      ? (plans.data?.find((p) => p.planId === presetId) ?? null)
      : null
  const selected = picked ?? preset

  // 미리 고른 요금제가 목록 아래쪽에 있어도 보이게 한다
  const presetShown = preset != null && !sub.isPending
  useEffect(() => {
    if (presetShown) presetRef.current?.scrollIntoView?.({ block: 'center' })
  }, [presetShown])

  if (sub.isPending) return <p className="tm-pulse px-5 py-10 text-center text-sm text-ink-sub">불러오는 중…</p>

  const pick = (plan: Plan) => {
    setPicked(plan)
    setTouched(true)
    setError(null)
  }

  const submit = async () => {
    if (!selected) return
    setSubmitting(true)
    setError(null)
    const birth = needsBirthDate(selected) && birthDate ? birthDate : undefined
    try {
      if (changing) {
        const res = await subscriptionApi.changePlan({ planId: selected.planId, birthDate: birth })
        await refreshSubscription()
        showToast(
          res.pendingChange
            ? `요금제 변경을 신청했어요.\n${formatDate(res.pendingChange.effectiveFrom)}부터 적용돼요`
            : '요금제를 변경했어요',
          3000,
        )
      } else {
        const res = await subscriptionApi.subscribe({ planId: selected.planId, birthDate: birth, contract })
        await refreshSubscription()
        showToast(
          res.pendingActivation
            ? `가입을 신청했어요.\n${formatDate(res.pendingActivation.effectiveFrom)}에 개통돼요`
            : '요금제에 가입했어요',
          3000,
        )
      }
      navigate('/my/plan', { replace: true })
    } catch (e) {
      // 서버 안내(연령 확인·변경 제한 등)를 그대로 보여 준다
      setError(e instanceof ApiError ? e.message : '요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.')
    } finally {
      setSubmitting(false)
    }
  }

  // 변경 확인 단계: 이번 달 사용량이 고른 요금제 한도를 넘으면 알린다 (변경은 막지 않는다)
  const monthUsage = usage.data?.status === 'ACTIVE' ? usage.data.usage : null
  const warning = changing && selected && monthUsage ? exceededWarning(monthUsage, selected) : null

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-col gap-2 px-4 pb-3 pt-1">
        <div {...networkDrag} role="group" aria-label="망 구분" className="no-scrollbar flex gap-1.5 overflow-x-auto">
          {NETWORKS.map((n) => (
            <button key={n ?? 'all'} type="button" aria-pressed={networkType === n} onClick={() => setNetworkType(n)} className={chip(networkType === n)}>
              {n ? NETWORK_LABEL[n] : '전체'}
            </button>
          ))}
        </div>
        <div {...targetDrag} role="group" aria-label="대상 구분" className="no-scrollbar flex gap-1.5 overflow-x-auto">
          {TARGETS.map((t) => (
            <button key={t ?? 'all'} type="button" aria-pressed={targetGroup === t} onClick={() => setTargetGroup(t)} className={chip(targetGroup === t)}>
              {t ? TARGET_LABEL[t] : '모든 대상'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2.5 px-4 pb-4">
        {plans.isError ? (
          <ErrorBox
            message={plans.error instanceof ApiError ? plans.error.message : '요금제 목록을 불러오지 못했어요.'}
            onRetry={() => void plans.refetch()}
          />
        ) : plans.isPending ? (
          [0, 1, 2].map((i) => <div key={i} aria-hidden className="tm-pulse h-[132px] rounded-card bg-surface" />)
        ) : plans.data.length === 0 ? (
          <p className="rounded-card bg-surface px-4 py-6 text-center text-sm text-ink-sub">조건에 맞는 요금제가 없어요.</p>
        ) : (
          <ul role="radiogroup" aria-label="요금제" className="m-0 flex list-none flex-col gap-2.5 p-0">
            {plans.data.map((plan) => {
              const isCurrent = changing && plan.planId === currentPlanId
              const on = selected?.planId === plan.planId
              return (
                <li key={plan.planId} ref={preset?.planId === plan.planId ? presetRef : undefined}>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={on}
                    disabled={isCurrent}
                    onClick={() => pick(plan)}
                    className={`flex w-full flex-col gap-2 rounded-card border-[1.5px] bg-surface p-4 text-left text-ink disabled:opacity-60 ${
                      on ? 'border-brand' : 'border-transparent'
                    }`}
                  >
                    {isCurrent && <span className="self-start rounded-md bg-surface-2 px-1.5 py-[2px] text-[11px] font-bold text-ink-sub">사용 중</span>}
                    <PlanSummary plan={plan} />
                    {on && (
                      <span className="flex items-center gap-1 self-end text-xs font-bold text-brand-text">
                        <Check size={14} strokeWidth={2.4} aria-hidden />
                        선택함
                      </span>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {selected && (
        <div className="sticky bottom-0 z-[2] flex flex-col gap-3 rounded-t-[26px] bg-surface px-4 pb-4 pt-4 shadow-[0_-6px_20px_rgba(0,0,0,0.08)]">
          <div className="flex items-baseline justify-between gap-3">
            <strong className="min-w-0 truncate text-[15px] font-extrabold">{selected.name}</strong>
            <span className="shrink-0 text-[15px] font-extrabold">
              {contract && !changing ? (
                <>
                  <span className="mr-1.5 text-xs font-semibold text-ink-muted line-through">{won(selected.monthlyFee)}</span>
                  {won(selected.monthlyFee - contractDiscount(selected.monthlyFee))}
                </>
              ) : (
                won(selected.monthlyFee)
              )}
              <span className="text-xs font-semibold text-ink-muted"> /월</span>
            </span>
          </div>

          {!changing && (
            <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-surface-2 px-3.5 py-3">
              <input
                type="checkbox"
                checked={contract}
                onChange={(e) => setContract(e.target.checked)}
                className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--brand)]"
              />
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="text-[15px] font-bold">약정으로 가입 ({CONTRACT_MONTHS}개월)</span>
                <span className="text-[13px] leading-[18px] text-ink-sub">
                  매달 <strong className="text-brand-text">{won(contractDiscount(selected.monthlyFee))}</strong> 할인
                  (월정액 {CONTRACT_DISCOUNT_PERCENT}%). 약정 기간 안에 해지하면 위약금이 있어요.
                </span>
              </span>
            </label>
          )}

          {needsBirthDate(selected) && (
            <TextField
              label="생년월일"
              type="date"
              value={birthDate}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setBirthDate(e.target.value)}
              hint={`${TARGET_LABEL[selected.targetGroup]} 요금제는 나이 확인이 필요해요. 한 번 확인하면 다음부터는 비워 둬도 돼요.`}
            />
          )}

          {warning && (
            <p className="m-0 flex gap-2 rounded-2xl bg-surface-2 px-3.5 py-3 text-[13px] leading-[19px] text-ink">
              <TriangleAlert size={16} strokeWidth={2.2} aria-hidden className="mt-[1px] shrink-0 text-danger" />
              <span>{warning}</span>
            </p>
          )}

          {error && (
            <p role="alert" className="m-0 text-[13px] font-semibold leading-[18px] text-danger">
              {error}
            </p>
          )}

          <button
            type="button"
            disabled={submitting}
            onClick={() => void submit()}
            className="min-h-[52px] rounded-2xl bg-brand text-base font-bold text-white disabled:opacity-60"
          >
            {submitting ? '처리하는 중…' : changing ? '이 요금제로 변경' : '가입하기'}
          </button>
        </div>
      )}
    </div>
  )
}
