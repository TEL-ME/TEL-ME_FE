import { Bell, ChevronRight, CirclePause, Link2, Lock, Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { SessionStatus } from '../api/types'
import noteImg from '../assets/my/mudo-note.png'
import { openLoginSheet } from '../features/auth/loginSheetStore'
import { useMe } from '../features/auth/useAuth'
import { useSessions } from '../features/chat/sessionQueries'
import { useUnreadNotifications } from '../features/notifications/queries'
import { formatListDate } from '../lib/date'
import UsageSection from '../features/plans/components/UsageSection'
import { formatDate, won } from '../features/plans/format'
import { useSubscription, useUsage } from '../features/plans/queries'

const BADGE: Record<SessionStatus, { label: string; cls: string }> = {
  NEED_CLARIFICATION: { label: '답변 대기', cls: 'bg-brand-soft text-brand-strong' },
  CLOSED: { label: '완료', cls: 'bg-surface-2 text-ink-sub' },
  ACTIVE: { label: '진행 중', cls: 'bg-chip-plan-bg text-chip-plan' },
}

/** 마이 (게스트 · 로그인 후). 로그인하면 내 요금제·예상 요금·월별 사용량을 보여 준다 */
export default function MyPage() {
  const navigate = useNavigate()
  const { me, isUser } = useMe()
  const sessions = useSessions()
  const list = sessions.data?.pages.flatMap((p) => p.sessions) ?? []
  const unreadNotifications = useUnreadNotifications().data ?? 0

  return (
    <main className="no-scrollbar mx-auto w-full max-w-[480px] flex-1 overflow-y-auto">
      <header className="flex items-center justify-between px-4 pb-2 pt-4">
        <h1 aria-label="TEL-ME" className="font-logo text-[28px] font-black leading-8 tracking-[-0.8px]">
          tel<span className="text-brand-text">me</span>
        </h1>
        <button
          type="button"
          aria-label={unreadNotifications > 0 ? `알림, 안 읽은 알림 ${unreadNotifications}개` : '알림'}
          onClick={() => navigate('/my/notifications')}
          className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-surface text-ink"
        >
          <Bell size={20} strokeWidth={1.8} aria-hidden />
          {unreadNotifications > 0 && (
            <span aria-hidden className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-danger ring-2 ring-surface" />
          )}
        </button>
      </header>

      <div className="flex flex-col gap-[18px] px-4 pb-6 pt-2">
        {/* 프로필 카드 */}
        <section className="relative min-h-[196px] overflow-hidden rounded-[26px] bg-surface p-5">
          <div className="relative z-[1] flex max-w-[200px] flex-col items-start gap-1">
            {isUser ? (
              <>
                {/* 이름이 없으면(소셜·이름 저장 전) 이메일로 대신한다 */}
                <strong className="break-all text-xl font-extrabold leading-[26px]">{me.name ?? me.email ?? '소셜 계정'} 님</strong>
                <PlanBrief />
              </>
            ) : (
              <>
                <span className="rounded-full bg-brand-soft px-[9px] py-[3px] text-xs font-bold text-brand-strong">
                  게스트로 이용 중
                </span>
                <strong className="mt-1.5 text-xl font-extrabold leading-7 tracking-[-0.4px]">
                  로그인하고
                  <br />내 요금 한눈에 보기
                </strong>
                <span className="text-[13px] leading-[19px] text-ink-sub">
                  지금까지 나눈 상담도
                  <br />내 계정으로 그대로 옮겨져요
                </span>
              </>
            )}
          </div>
          <img src={noteImg} alt="" className="absolute -bottom-3.5 -right-2 z-[1] w-[180px]" />
        </section>

        {!isUser && (
          <button
            type="button"
            onClick={() => openLoginSheet()}
            className="-mt-2 flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-inverse text-base font-bold text-inverse-ink"
          >
            <Link2 size={18} strokeWidth={2} aria-hidden />
            간편 로그인 연결
          </button>
        )}

        {/* 사용량 (월 이동) */}
        {isUser ? (
          <>
            <UsageSection />
            <button
              type="button"
              onClick={() => navigate('/', { state: { ask: '나에게 맞는 요금제 찾기' } })}
              className="-mt-2 flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-surface text-[15px] font-bold text-brand-strong"
            >
              <Plus size={18} strokeWidth={2} aria-hidden />
              무러바라에게 요금제 물어보기
            </button>
          </>
        ) : (
          <section className="flex flex-col gap-2.5">
            <h2 className="text-[17px] font-extrabold tracking-[-0.3px]">이번 달 사용량</h2>
            <div className="flex items-center gap-3.5 rounded-card bg-surface p-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-brand-soft text-brand-strong">
                <Lock size={20} strokeWidth={1.8} aria-hidden />
              </span>
              <p className="text-sm font-semibold leading-5">로그인하면 데이터·통화 사용량과 예상 요금을 보여드려요</p>
            </div>
          </section>
        )}

        {/* 상담 기록 (최근 3개) */}
        <section className="flex flex-col gap-2">
          <div className="flex items-baseline gap-1.5">
            <h2 className="text-[17px] font-extrabold tracking-[-0.3px]">{isUser ? '내 상담' : '게스트로 나눈 상담'}</h2>
            <span className="text-[15px] font-extrabold text-brand-text">{list.length}</span>
          </div>
          {list.length > 0 ? (
            <ul className="rounded-card bg-surface px-3 py-1">
              {list.slice(0, 3).map((s) => (
                <li key={s.sessionId}>
                  <button
                    type="button"
                    onClick={() => navigate(`/chat/${s.sessionId}`)}
                    className="flex min-h-14 w-full items-center gap-3 px-1 py-2 text-left text-ink"
                  >
                    <span className={`min-w-[52px] shrink-0 rounded-lg px-2 py-1 text-center text-xs font-bold ${BADGE[s.status].cls}`}>
                      {BADGE[s.status].label}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="truncate text-[15px] font-semibold leading-5">{s.title || '새 대화'}</span>
                      <span className="text-xs leading-4 text-ink-sub">{formatListDate(s.lastActiveAt)}</span>
                    </span>
                    <ChevronRight size={18} strokeWidth={2.2} aria-hidden className="shrink-0" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex flex-col items-start gap-2.5 rounded-card bg-surface px-4 py-[18px]">
              <p className="text-sm text-ink-sub">아직 나눈 상담이 없어요</p>
              <button
                type="button"
                onClick={() => navigate('/')}
                className="flex min-h-10 items-center gap-1 rounded-xl bg-brand-soft px-3.5 text-sm font-bold text-brand-strong"
              >
                <Plus size={16} strokeWidth={2.2} aria-hidden />
                무러바라에게 물어보기
              </button>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

const linkButton =
  'mt-4 flex min-h-10 items-center gap-1 rounded-xl bg-brand-soft px-3.5 text-sm font-bold text-brand-strong'

/**
 * 프로필 카드 안의 요금 요약. 상태에 따라
 * - 미가입: 가입 유도 · 개통 전: 개통 예정일 · 이용 중: 요금제 이름 + 이번 달 예상 요금(전월 대비는 있을 때만)
 */
function PlanBrief() {
  const navigate = useNavigate()
  const sub = useSubscription()
  const usage = useUsage(null)

  if (sub.isPending) return <span className="tm-pulse mt-1 h-4 w-32 rounded-full bg-surface-2" />
  if (sub.isError) return <span className="text-xs text-ink-sub">요금제 정보를 불러오지 못했어요</span>

  const s = sub.data.subscription
  if (!sub.data.subscribed || !s) {
    return (
      <>
        <span className="text-[13px] leading-[19px] text-ink-sub">
          아직 가입한 요금제가 없어요.
          <br />
          나에게 맞는 요금제를 골라 보세요
        </span>
        <button type="button" onClick={() => navigate('/my/plan/select')} className={linkButton}>
          요금제 둘러보기
          <ChevronRight size={16} strokeWidth={2.2} aria-hidden />
        </button>
      </>
    )
  }

  const plan = s.currentPlan ?? s.pendingActivation?.plan
  const fee = usage.data?.usage?.expectedFee
  return (
    <>
      <button
        type="button"
        onClick={() => navigate('/my/plan')}
        className="flex items-center gap-0.5 text-left text-xs font-semibold text-ink-sub"
      >
        {plan?.name ?? '내 요금제'}
        <ChevronRight size={14} strokeWidth={2.2} aria-hidden />
      </button>
      {!s.currentPlan ? (
        <span className="mt-4 rounded-xl bg-brand-soft px-3 py-2 text-[13px] font-bold leading-[18px] text-brand-strong">
          {formatDate(s.pendingActivation?.effectiveFrom)}
          <br />
          개통 예정이에요
        </span>
      ) : (
        <>
          <span className="mt-4 flex items-center gap-1.5 text-[13px] text-ink-sub">
            이번 달 예상 요금
            {s.pause && (
              <span className="flex items-center gap-0.5 rounded-md bg-notice px-1.5 py-px text-[11px] font-bold text-notice-text">
                <CirclePause size={11} strokeWidth={2.4} aria-hidden />
                정지 중
              </span>
            )}
          </span>
          {fee ? (
            <>
              <span className="text-[30px] font-extrabold leading-9 tracking-[-0.8px]">
                {fee.amount.toLocaleString('ko-KR')}
                <span className="text-xl">원</span>
              </span>
              {fee.difference != null && (
                <span className="text-xs font-semibold text-brand-strong">
                  {fee.difference === 0
                    ? '지난달과 같아요'
                    : `지난달보다 ${won(Math.abs(fee.difference))} ${fee.difference < 0 ? '줄었어요' : '늘었어요'}`}
                </span>
              )}
            </>
          ) : usage.isPending ? (
            <span className="tm-pulse mt-1 h-8 w-28 rounded-xl bg-surface-2" />
          ) : (
            <span className="text-sm text-ink-sub">예상 요금을 불러오지 못했어요</span>
          )}
        </>
      )}
    </>
  )
}
