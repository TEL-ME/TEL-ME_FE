import { CircleAlert, Mail, MessageCircle, X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { closeLoginSheet, useLoginSheet } from './loginSheetStore'
import { SOCIAL_PROVIDERS, startSocialLogin } from './socialProviders'

/** 간편 로그인 바텀시트 (Auth-2) */
export default function LoginSheet() {
  const { open, subtitle, error } = useLoginSheet()
  const navigate = useNavigate()
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeLoginSheet()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  if (!open) return null

  const go = (path: string) => {
    closeLoginSheet()
    navigate(path)
  }

  return (
    <div className="fixed inset-0 z-40">
      <button
        type="button"
        aria-label="닫기"
        onClick={closeLoginSheet}
        className="absolute inset-0 bg-[rgba(43,38,45,0.45)]"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="간편 로그인"
        className="tm-rise absolute inset-x-0 bottom-0 mx-auto flex max-w-[480px] flex-col gap-3 rounded-t-[28px] bg-surface px-5 pb-6 pt-2.5"
      >
        <span aria-hidden className="h-[5px] w-10 self-center rounded-full bg-line" />
        <div className="flex items-start gap-3 pb-1 pt-2">
          <div className="min-w-0 flex-1">
            <h2 className="text-[22px] font-extrabold leading-[30px] tracking-[-0.5px]">간편하게 로그인하세요</h2>
            <p className="mt-1.5 text-sm leading-[21px] text-ink-sub">
              {subtitle ?? '로그인하면 게스트로 나눈 상담도 내 계정으로 그대로 옮겨져요'}
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            aria-label="닫기"
            onClick={closeLoginSheet}
            className="-mr-2.5 -mt-1.5 flex h-11 w-11 shrink-0 items-center justify-center text-ink-sub"
          >
            <X size={20} strokeWidth={2} aria-hidden />
          </button>
        </div>

        {error && (
          <div role="alert" className="flex gap-2 rounded-[14px] bg-brand-soft px-3.5 py-3 text-sm font-semibold leading-5 text-brand-strong">
            <CircleAlert size={16} strokeWidth={2} aria-hidden className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex flex-col gap-2">
          {SOCIAL_PROVIDERS.filter((p) => p.enabled).map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => startSocialLogin(p)}
              className={`flex min-h-[52px] items-center justify-center gap-2.5 rounded-2xl text-base font-bold ${p.className}`}
            >
              {p.id === 'kakao' && <MessageCircle size={20} fill="currentColor" strokeWidth={0} aria-hidden />}
              {p.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => go('/auth/login')}
            className="flex min-h-[52px] items-center justify-center gap-2.5 rounded-2xl bg-surface-2 text-base font-bold text-ink"
          >
            <Mail size={20} strokeWidth={1.8} aria-hidden />
            이메일로 로그인
          </button>
        </div>

        <p className="mt-1 text-center text-sm leading-5 text-ink-sub">
          처음이세요?{' '}
          <button
            type="button"
            onClick={() => go('/auth/signup')}
            className="px-0.5 py-1 font-bold text-brand-strong underline underline-offset-[3px]"
          >
            이메일로 회원가입
          </button>
        </p>
      </div>
    </div>
  )
}
