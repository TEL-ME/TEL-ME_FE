import { ChevronLeft, Lock } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { openLoginSheet } from '../../auth/loginSheetStore'
import { useMe } from '../../auth/useAuth'
import { goBack } from '../../stores/goBack'

/** 요금제 화면 공통 틀: 뒤로 + 제목 */
export function PlanFrame({ title, children, fallback = '/my' }: { title: string; children: ReactNode; fallback?: string }) {
  const navigate = useNavigate()
  return (
    <main className="no-scrollbar mx-auto flex w-full max-w-[480px] flex-1 flex-col overflow-y-auto">
      <header className="sticky top-0 z-[2] flex shrink-0 items-center gap-1 bg-bg pb-1 pl-2 pr-4 pt-2">
        <button
          type="button"
          aria-label="뒤로"
          onClick={() => goBack(navigate, fallback)}
          className="flex h-11 w-11 items-center justify-center text-ink"
        >
          <ChevronLeft size={22} strokeWidth={2} aria-hidden />
        </button>
        <h1 className="text-[17px] font-extrabold">{title}</h1>
      </header>
      {children}
    </main>
  )
}

const LOGIN_NOTE = '요금제 가입·변경·해지는 로그인한 회원만 할 수 있어요'

/**
 * 로그인 회원만 볼 수 있는 화면. 게스트면 로그인 시트를 한 번 띄우고(로그인 뒤 이 화면으로 돌아온다),
 * 닫아도 같은 안내와 로그인 버튼을 남겨 둔다
 */
export function RequireLogin({ children }: { children: ReactNode }) {
  const { isUser, isLoading } = useMe()
  const asked = useRef(false)

  useEffect(() => {
    if (isLoading || isUser || asked.current) return
    asked.current = true
    openLoginSheet({ subtitle: LOGIN_NOTE })
  }, [isLoading, isUser])

  if (isLoading) return <p className="tm-pulse px-5 py-10 text-center text-sm text-ink-sub">불러오는 중…</p>
  if (isUser) return <>{children}</>
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft text-brand-strong">
        <Lock size={22} strokeWidth={1.8} aria-hidden />
      </span>
      <p className="text-[17px] font-extrabold">로그인이 필요해요</p>
      <p className="text-sm leading-5 text-ink-sub">{LOGIN_NOTE}</p>
      <button
        type="button"
        onClick={() => openLoginSheet({ subtitle: LOGIN_NOTE })}
        className="mt-2 min-h-[52px] w-[240px] max-w-full rounded-2xl bg-brand text-base font-bold text-white"
      >
        로그인하기
      </button>
    </div>
  )
}

/** 요청 실패 안내 (서버 message를 그대로) */
export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex items-center gap-3 rounded-card bg-surface p-4">
      <p className="min-w-0 flex-1 text-sm leading-5 text-ink-sub">{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="min-h-9 shrink-0 rounded-full bg-surface-2 px-3 text-[13px] font-bold text-ink">
          다시 시도
        </button>
      )}
    </div>
  )
}
