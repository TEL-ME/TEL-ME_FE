import { CalendarClock, CirclePause, FileSignature, Minus, Plus, Repeat } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiError } from '../api/client'
import { subscriptionApi, type Subscription, type TerminationPenalty } from '../api/plans'
import ConfirmDialog from '../components/ConfirmDialog'
import { ErrorBox, PlanFrame, RequireLogin } from '../features/plans/components/PlanFrame'
import { PlanSummary } from '../features/plans/components/PlanSummary'
import { formatDate, formatDateTime, won } from '../features/plans/format'
import { refreshSubscription, useSubscription } from '../features/plans/queries'
import { showToast } from '../stores/toastStore'

const errorText = (e: unknown, fallback: string) => (e instanceof ApiError ? e.message : fallback)

function Card({ title, icon, children }: { title: string; icon?: ReactNode; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-card bg-surface p-4">
      <h2 className="m-0 flex items-center gap-1.5 text-[13px] font-bold leading-[18px] text-ink-sub">
        {icon}
        {title}
      </h2>
      {children}
    </section>
  )
}

const subtleButton = 'min-h-11 rounded-2xl bg-surface-2 px-4 text-[15px] font-bold text-ink disabled:opacity-50'

/** 내 요금제: 현재 요금제 · 개통 대기 · 적용 전 변경 · 약정 · 일시 정지, 그리고 변경·해지 */
export default function MyPlanPage() {
  return (
    <PlanFrame title="내 요금제">
      <RequireLogin>
        <MyPlan />
      </RequireLogin>
    </PlanFrame>
  )
}

function MyPlan() {
  const navigate = useNavigate()
  const query = useSubscription()

  // 가입하지 않았으면 가입 화면으로
  const notSubscribed = query.data?.subscribed === false
  useEffect(() => {
    if (notSubscribed) navigate('/my/plan/select', { replace: true })
  }, [notSubscribed, navigate])

  if (query.isError) {
    return (
      <div className="px-4 pt-2">
        <ErrorBox message={errorText(query.error, '요금제 정보를 불러오지 못했어요.')} onRetry={() => void query.refetch()} />
      </div>
    )
  }
  const sub = query.data?.subscription
  if (!sub) return <p className="tm-pulse px-5 py-10 text-center text-sm text-ink-sub">불러오는 중…</p>
  return <Details sub={sub} />
}

function Details({ sub }: { sub: Subscription }) {
  const navigate = useNavigate()
  const activated = sub.currentPlan != null

  return (
    <div className="flex flex-col gap-3 px-4 pb-8 pt-1">
      {sub.currentPlan ? (
        <Card title="사용 중인 요금제">
          <PlanSummary plan={sub.currentPlan} />
          <p className="m-0 text-xs text-ink-muted">{formatDate(sub.subscribedAt)} 가입</p>
        </Card>
      ) : (
        sub.pendingActivation && (
          <Card title="개통 대기" icon={<CalendarClock size={15} strokeWidth={2} aria-hidden />}>
            <PlanSummary plan={sub.pendingActivation.plan} />
            <p className="m-0 rounded-xl bg-brand-soft px-3 py-2.5 text-sm font-semibold leading-5 text-brand-strong">
              {formatDate(sub.pendingActivation.effectiveFrom)}에 개통될 예정이에요
            </p>
          </Card>
        )
      )}

      {sub.pendingChange && (
        <Card title="변경 예정" icon={<Repeat size={15} strokeWidth={2} aria-hidden />}>
          <PlanSummary plan={sub.pendingChange.plan} showAllowance={false} />
          <p className="m-0 text-sm leading-5 text-ink-sub">{formatDate(sub.pendingChange.effectiveFrom)}부터 이 요금제가 적용돼요</p>
        </Card>
      )}

      <Card title="약정" icon={<FileSignature size={15} strokeWidth={2} aria-hidden />}>
        {!sub.contract ? (
          <p className="m-0 text-[15px] font-semibold">약정 없이 이용 중이에요</p>
        ) : sub.contract.active ? (
          <div className="flex flex-col gap-1">
            <p className="m-0 text-[15px] font-semibold">
              {sub.contract.months}개월 약정 · 매달 <span className="text-brand-text">{won(sub.contract.monthlyDiscount)}</span> 할인
            </p>
            <p className="m-0 text-xs text-ink-muted">
              월정액 {sub.contract.discountPercent}% 할인 · {formatDate(sub.contract.endsAt)} 만료
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-surface-2 px-2 py-[3px] text-xs font-bold text-ink-sub">약정 만료</span>
            <p className="m-0 text-sm text-ink-sub">{formatDate(sub.contract.endsAt)}에 약정이 끝났어요</p>
          </div>
        )}
      </Card>

      <PauseCard sub={sub} activated={activated} />

      <div className="mt-1 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => navigate('/my/plan/select')}
          className="min-h-[52px] rounded-2xl bg-brand text-base font-bold text-white"
        >
          요금제 변경
        </button>
        <CancelButton />
      </div>
    </div>
  )
}

/** 일시 정지: 정지 중이면 종료 예정·기본료와 해제, 아니면 1~30일 신청 */
function PauseCard({ sub, activated }: { sub: Subscription; activated: boolean }) {
  const [asking, setAsking] = useState(false)
  const [confirmResume, setConfirmResume] = useState(false)
  const [days, setDays] = useState(7)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const pause = async () => {
    setWorking(true)
    setError(null)
    try {
      await subscriptionApi.pause(days)
      await refreshSubscription()
      setAsking(false)
      showToast(`${days}일 동안 일시 정지했어요`)
    } catch (e) {
      setError(errorText(e, '일시 정지를 신청하지 못했어요.'))
    } finally {
      setWorking(false)
    }
  }
  const resume = async () => {
    setConfirmResume(false)
    setWorking(true)
    try {
      await subscriptionApi.resume()
      await refreshSubscription()
      showToast('일시 정지를 해제했어요')
    } catch (e) {
      showToast(errorText(e, '일시 정지를 해제하지 못했어요.'), 3000)
    } finally {
      setWorking(false)
    }
  }

  return (
    <Card title="일시 정지" icon={<CirclePause size={15} strokeWidth={2} aria-hidden />}>
      {sub.pause ? (
        <>
          <div className="flex flex-col gap-1">
            <p className="m-0 flex items-center gap-2 text-[15px] font-semibold">
              <span className="rounded-lg bg-notice px-2 py-[3px] text-xs font-bold text-notice-text">정지 중</span>
              {formatDateTime(sub.pause.endsAt)}까지
            </p>
            <p className="m-0 text-xs text-ink-muted">정지 기간 기본료 월 {won(sub.pause.reducedMonthlyFee)}</p>
          </div>
          <button type="button" disabled={working} onClick={() => setConfirmResume(true)} className={subtleButton}>
            정지 해제
          </button>
        </>
      ) : asking ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[15px] font-semibold">정지할 기간</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="하루 줄이기"
                disabled={days <= 1}
                onClick={() => setDays((d) => Math.max(1, d - 1))}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-2 disabled:opacity-40"
              >
                <Minus size={16} strokeWidth={2.2} aria-hidden />
              </button>
              <output aria-live="polite" className="min-w-[52px] text-center text-[17px] font-extrabold">
                {days}일
              </output>
              <button
                type="button"
                aria-label="하루 늘리기"
                disabled={days >= 30}
                onClick={() => setDays((d) => Math.min(30, d + 1))}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-2 disabled:opacity-40"
              >
                <Plus size={16} strokeWidth={2.2} aria-hidden />
              </button>
            </div>
          </div>
          <p className="m-0 text-xs leading-[18px] text-ink-muted">
            한 번에 1~30일까지 정지할 수 있어요. 정지 중에는 기본료가 줄고, 요금제 변경은 할 수 없어요.
          </p>
          {error && (
            <p role="alert" className="m-0 text-[13px] font-semibold text-danger">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <button type="button" onClick={() => setAsking(false)} className={`${subtleButton} flex-1`}>
              취소
            </button>
            <button
              type="button"
              disabled={working}
              onClick={() => void pause()}
              className="min-h-11 flex-1 rounded-2xl bg-inverse px-4 text-[15px] font-bold text-inverse-ink disabled:opacity-50"
            >
              {working ? '신청하는 중…' : `${days}일 정지하기`}
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className="m-0 text-sm leading-5 text-ink-sub">
            {activated ? '잠시 쓰지 않을 때 회선을 멈춰 둘 수 있어요.' : '개통한 뒤에 일시 정지를 신청할 수 있어요.'}
          </p>
          <button type="button" disabled={!activated} onClick={() => setAsking(true)} className={subtleButton}>
            일시 정지 신청
          </button>
        </>
      )}
      <ConfirmDialog
        open={confirmResume}
        title="일시 정지를 해제할까요?"
        confirmLabel="해제"
        onCancel={() => setConfirmResume(false)}
        onConfirm={() => void resume()}
      >
        해제하면 바로 다시 이용할 수 있고, 기본료도 원래대로 돌아가요.
      </ConfirmDialog>
    </Card>
  )
}

/** 해지: 예상 위약금을 먼저 보여 주고 확인받는다 */
function CancelButton() {
  const navigate = useNavigate()
  const [penalty, setPenalty] = useState<TerminationPenalty | null>(null)
  const [loading, setLoading] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  const open = async () => {
    setLoading(true)
    try {
      setPenalty(await subscriptionApi.penalty())
    } catch (e) {
      showToast(errorText(e, '예상 위약금을 불러오지 못했어요.'), 3000)
    } finally {
      setLoading(false)
    }
  }
  const cancel = async () => {
    setCancelling(true)
    try {
      const applied = await subscriptionApi.cancel()
      setPenalty(null)
      // 먼저 화면을 옮긴다 (여기 남아 있으면 미가입으로 바뀌는 순간 가입 화면으로 넘어간다)
      navigate('/my', { replace: true })
      showToast(applied.penalty > 0 ? `요금제를 해지했어요.\n위약금 ${won(applied.penalty)}이 청구돼요` : '요금제를 해지했어요', 3000)
      await refreshSubscription()
    } catch (e) {
      setPenalty(null)
      showToast(errorText(e, '요금제를 해지하지 못했어요.'), 3000)
    } finally {
      setCancelling(false)
    }
  }

  return (
    <>
      <button
        type="button"
        disabled={loading || cancelling}
        onClick={() => void open()}
        className="min-h-11 text-sm font-semibold text-ink-muted underline underline-offset-2 disabled:opacity-50"
      >
        {loading ? '위약금 확인 중…' : '요금제 해지'}
      </button>
      <ConfirmDialog
        open={penalty != null}
        title="요금제를 해지할까요?"
        confirmLabel={cancelling ? '해지하는 중…' : '해지'}
        onCancel={() => setPenalty(null)}
        onConfirm={() => !cancelling && void cancel()}
      >
        {penalty && <PenaltyDetail penalty={penalty} />}
      </ConfirmDialog>
    </>
  )
}

export function PenaltyDetail({ penalty }: { penalty: TerminationPenalty }) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between rounded-2xl bg-surface-2 px-4 py-3">
        <span className="text-sm font-semibold text-ink-sub">예상 위약금</span>
        <strong className={`text-xl font-extrabold ${penalty.penalty > 0 ? 'text-danger' : 'text-ink'}`}>{won(penalty.penalty)}</strong>
      </div>
      {penalty.hasContract ? (
        <ul className="m-0 flex list-none flex-col gap-1 p-0 text-[13px] leading-5">
          <li>
            약정 {penalty.contractMonths}개월 중 {penalty.elapsedMonths}개월 이용
          </li>
          <li>지금까지 받은 할인 {won(penalty.receivedDiscount)}</li>
          <li>받은 할인의 {penalty.refundPercent}%를 위약금으로 내요</li>
        </ul>
      ) : (
        <p className="m-0 text-[13px] leading-5">약정 없이 이용 중이라 위약금이 없어요.</p>
      )}
      <p className="m-0 text-[13px] leading-5">해지하면 이 요금제를 더 이용할 수 없어요.</p>
    </div>
  )
}
