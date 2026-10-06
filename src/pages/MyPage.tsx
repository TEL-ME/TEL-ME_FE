import { Bell, ChevronRight, Link2, Lock, Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { SessionStatus } from '../api/types'
import noteImg from '../assets/my/mudo-note.png'
import { openLoginSheet } from '../features/auth/loginSheetStore'
import { useMe } from '../features/auth/useAuth'
import { useSessions } from '../features/chat/sessionQueries'
import { formatListDate } from '../lib/date'
import { DUMMY_ACCOUNT } from '../features/my/dummyAccount'
import { showToast } from '../stores/toastStore'

const BADGE: Record<SessionStatus, { label: string; cls: string }> = {
  NEED_CLARIFICATION: { label: '답변 대기', cls: 'bg-brand-soft text-brand-strong' },
  CLOSED: { label: '완료', cls: 'bg-surface-2 text-ink-sub' },
  ACTIVE: { label: '진행 중', cls: 'bg-chip-plan-bg text-chip-plan' },
}

/** 마이 (게스트 · 로그인 후). 요금·사용량은 연동할 API가 없어 이번엔 자리만 둔다 */
export default function MyPage() {
  const navigate = useNavigate()
  const { me, isUser } = useMe()
  const sessions = useSessions()
  const list = sessions.data?.pages.flatMap((p) => p.sessions) ?? []

  return (
    <main className="no-scrollbar mx-auto w-full max-w-[480px] flex-1 overflow-y-auto">
      <header className="flex items-center justify-between px-4 pb-2 pt-4">
        <h1 aria-label="TEL-ME" className="font-logo text-[28px] font-black leading-8 tracking-[-0.8px]">
          tel<span className="text-brand-text">me</span>
        </h1>
        <button
          type="button"
          aria-label="알림"
          onClick={() => showToast('새 알림이 없어요')}
          className="flex h-11 w-11 items-center justify-center rounded-2xl bg-surface text-ink"
        >
          <Bell size={20} strokeWidth={1.8} aria-hidden />
        </button>
      </header>

      <div className="flex flex-col gap-[18px] px-4 pb-6 pt-2">
        {/* 프로필 카드 */}
        <section className="relative min-h-[196px] overflow-hidden rounded-[26px] bg-surface p-5">
          <div className="relative z-[1] flex max-w-[200px] flex-col items-start gap-1">
            {isUser ? (
              <>
                <div className="flex items-center gap-1.5">
                  {/* 이름이 없으면(소셜·이름 저장 전) 이메일로 대신한다 */}
                  <strong className="break-all text-xl font-extrabold leading-[26px]">
                    {me.name ?? me.email ?? '카카오 계정'} 님
                  </strong>
                </div>
                <span className="text-xs text-ink-sub">
                  {DUMMY_ACCOUNT.plan} <Temp />
                </span>
                <span className="mt-5 text-[13px] text-ink-sub">
                  이번 달 예상 요금 <Temp />
                </span>
                <span className="text-[30px] font-extrabold leading-9 tracking-[-0.8px]">
                  {DUMMY_ACCOUNT.monthlyFee.toLocaleString()}
                  <span className="text-xl">원</span>
                </span>
                <span className="text-xs font-semibold text-brand-strong">
                  지난달보다 {Math.abs(DUMMY_ACCOUNT.feeDiff).toLocaleString()}원 {DUMMY_ACCOUNT.feeDiff < 0 ? '줄었어요' : '늘었어요'}
                </span>
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

        {/* 이번 달 사용량: 요금·사용량 API가 생기면 채운다 */}
        <section className="flex flex-col gap-2.5">
          <div className="flex items-baseline gap-1.5">
            <h2 className="text-[17px] font-extrabold tracking-[-0.3px]">이번 달 사용량</h2>
            {isUser && <Temp />}
          </div>
          {isUser ? (
            <UsageCards />
          ) : (
            <div className="flex items-center gap-3.5 rounded-card bg-surface p-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-brand-soft text-brand-strong">
                <Lock size={20} strokeWidth={1.8} aria-hidden />
              </span>
              <p className="text-sm font-semibold leading-5">로그인하면 데이터·통화 사용량과 예상 요금을 보여드려요</p>
            </div>
          )}
          {isUser && (
            <button
              type="button"
              onClick={() => navigate('/', { state: { ask: '나에게 맞는 요금제 찾기' } })}
              className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-surface text-[15px] font-bold text-brand-strong"
            >
              <Plus size={18} strokeWidth={2} aria-hidden />
              무러바라에게 요금제 물어보기
            </button>
          )}
        </section>

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

/** 임의로 넣은 값 옆에 붙이는 표시 */
function Temp() {
  return <span className="text-[11px] font-semibold text-ink-muted">(임시)</span>
}

/** 이번 달 사용량 카드 (시안 값, 임시). 두 장이라 스크롤 없이 반반으로 둔다 */
function UsageCards() {
  const { data, call } = DUMMY_ACCOUNT
  return (
    <div className="grid grid-cols-2 gap-2.5">
      <div className="flex min-w-0 flex-col gap-2.5 rounded-card bg-surface px-4 pb-[18px] pt-4">
        <div className="flex items-center gap-2">
          <span className="rounded-lg bg-chip-roam-bg px-2 py-[3px] text-xs font-bold text-chip-roam">데이터</span>
          <span className="text-xs text-ink-sub">D-{data.daysLeft}</span>
        </div>
        <p className="text-[13px] text-ink-sub">기본 {data.totalGb}GB 중</p>
        <p className="text-[clamp(19px,5.4vw,24px)] font-extrabold leading-[1.25] tracking-[-0.6px]">{data.leftGb}GB 남았어요</p>
        <div className="h-2 overflow-hidden rounded-full bg-surface-2">
          <div className="h-full rounded-full bg-gradient-to-r from-[#8fb6ec] to-[#2a5f9e]" style={{ width: `${data.usedPercent}%` }} />
        </div>
        <p className="-mt-0.5 text-right text-xs text-ink-sub">{data.usedPercent}% 사용</p>
      </div>
      <div className="flex min-w-0 flex-col gap-2.5 rounded-card bg-surface px-4 pb-[18px] pt-4">
        <div className="flex items-center gap-2">
          <span className="rounded-lg bg-chip-plan-bg px-2 py-[3px] text-xs font-bold text-chip-plan">통화·문자</span>
        </div>
        <p className="text-[13px] text-ink-sub">이번 달 통화</p>
        <p className="text-[clamp(19px,5.4vw,24px)] font-extrabold leading-[1.25] tracking-[-0.6px]">
          {call.minutes}분{call.unlimited ? ' · 무제한' : ''}
        </p>
        <div className="h-2 overflow-hidden rounded-full bg-surface-2">
          <div className="h-full w-full rounded-full bg-gradient-to-r from-[#9fd9c7] to-[#1c6e59]" />
        </div>
        <p className="-mt-0.5 text-right text-xs text-ink-sub">문자 기본제공</p>
      </div>
    </div>
  )
}
