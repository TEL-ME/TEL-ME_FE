import { Check, ChevronRight, Info, Link2, Mail } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import ConfirmDialog from '../components/ConfirmDialog'
import avatarImg from '../assets/mudo/mudo-avatar.png'
import { startSocialLink, type LinkFailure } from '../features/auth/accountLink'
import { SocialIcon } from '../features/auth/SocialIcon'
import { PROVIDER_NAME } from '../features/auth/socialProviders'
import { openLoginSheet } from '../features/auth/loginSheetStore'
import { logout, useMe } from '../features/auth/useAuth'
import { browserNotifyOn, browserNotifySupported, setBrowserNotify, useAnswerNotify } from '../features/chat/answerNotifier'
import { useThemeStore, type ThemeSetting } from '../stores/themeStore'
import { showToast } from '../stores/toastStore'
import type { LoginMethod, Me, SocialProviderCode } from '../api/types'

const APP_VERSION = '1.0.0'

const THEMES: { value: ThemeSetting; label: string }[] = [
  { value: 'system', label: '시스템' },
  { value: 'light', label: '라이트' },
  { value: 'dark', label: '다크' },
]

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="px-1 text-[13px] font-bold text-ink-sub">{title}</h2>
      <div className="rounded-card bg-surface px-3 py-1.5">{children}</div>
    </section>
  )
}

export default function SettingsPage() {
  const theme = useThemeStore((s) => s.theme)
  const setTheme = useThemeStore((s) => s.setTheme)
  const notifyOn = browserNotifyOn(useAnswerNotify((s) => s.browserEnabled))
  const canNotify = browserNotifySupported()
  const { me, isUser } = useMe()
  const navigate = useNavigate()
  const [confirmLogout, setConfirmLogout] = useState(false)
  // 연결하기에서 실패하고 돌아오면 콜백 화면이 이유를 넘겨준다 (새로고침하면 다시 뜨지 않게 바로 지운다)
  const location = useLocation()
  const [linkFail, setLinkFail] = useState<LinkFailure | null>(
    () => (location.state as { linkFailure?: LinkFailure } | null)?.linkFailure ?? null,
  )
  const hasFailState = Boolean((location.state as { linkFailure?: LinkFailure } | null)?.linkFailure)
  useEffect(() => {
    if (hasFailState) navigate(location.pathname, { replace: true, state: null })
  }, [hasFailState, navigate, location.pathname])

  const doLogout = async () => {
    setConfirmLogout(false)
    await logout()
    showToast('로그아웃했어요. 새 게스트로 시작해요')
    navigate('/')
  }

  return (
    <main className="no-scrollbar mx-auto w-full max-w-[480px] flex-1 overflow-y-auto px-4 pb-6">
      <h1 className="px-1 pb-2 pt-5 text-2xl font-extrabold tracking-tight">설정</h1>
      <div className="flex flex-col gap-4">
        <Section title="계정">
          <div className="flex items-center gap-3 px-1 py-3.5">
            <div className="h-11 w-11 shrink-0 overflow-hidden rounded-full bg-brand-soft">
              <img src={avatarImg} alt="" className="h-full w-full object-cover" />
            </div>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <strong className="truncate text-base">
                {isUser ? (me.name ? `${me.name} 님` : (me.email ?? '소셜 계정')) : '게스트로 이용 중'}
              </strong>
              <span className="text-xs leading-4 text-ink-sub">
                {isUser ? accountSub(me) : '로그인하면 상담 기록이 내 계정에 저장돼요'}
              </span>
            </span>
          </div>
          {!isUser && (
            <button
              type="button"
              onClick={() => openLoginSheet()}
              className="flex min-h-[56px] w-full items-center gap-3 px-1 text-left text-[15px] font-bold text-brand-strong"
            >
              <Link2 size={18} strokeWidth={2} aria-hidden />
              <span className="flex-1">간편 로그인 연결</span>
              <ChevronRight size={18} strokeWidth={2} aria-hidden className="text-ink-muted" />
            </button>
          )}
        </Section>

        {isUser && (
          <section className="flex flex-col gap-2">
            <h2 className="px-1 text-[13px] font-bold text-ink-sub">로그인 수단</h2>
            <div className="rounded-card bg-surface px-3 py-1">
              {(['KAKAO', 'GOOGLE'] as const).map((code) => (
                <SocialMethodRow key={code} code={code} linked={me.loginMethods.includes(code)} />
              ))}
              <MethodRow
                icon={
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand-strong">
                    <Mail size={20} strokeWidth={1.8} aria-hidden />
                  </span>
                }
                name="이메일·비밀번호"
                sub={me.loginMethods.includes('EMAIL') ? (me.email ?? '연결됨') : '추가하면 이메일로도 로그인할 수 있어요'}
                action={
                  me.loginMethods.includes('EMAIL') ? (
                    <LinkedMark />
                  ) : (
                    <ActionButton onClick={() => navigate('/settings/email-login')}>추가하기</ActionButton>
                  )
                }
              />
            </div>
            <p className="flex gap-1.5 px-1 text-[13px] leading-[19px] text-ink-sub">
              <Info size={16} strokeWidth={2} aria-hidden className="mt-px shrink-0" />
              카카오와 Google을 모두 연결할 수 있어요. 이미 다른 TEL-ME 계정에서 쓰는 소셜 계정은 연결할 수 없어요.
            </p>
          </section>
        )}

        <Section title="화면">
          <div className="flex min-h-[56px] items-center gap-3 px-1">
            <span className="flex-1 text-[15px] font-medium">화면 테마</span>
            <div role="radiogroup" aria-label="화면 테마" className="flex gap-0.5 rounded-full bg-surface-2 p-[3px]">
              {THEMES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  role="radio"
                  aria-checked={theme === t.value}
                  onClick={() => setTheme(t.value)}
                  className={`rounded-full px-2.5 py-1.5 text-xs font-bold ${
                    theme === t.value ? 'bg-surface text-ink' : 'text-ink-sub'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </Section>

        <Section title="알림">
          <button
            type="button"
            role="switch"
            aria-checked={notifyOn}
            disabled={!canNotify}
            onClick={() => void setBrowserNotify(!notifyOn)}
            className="flex min-h-[56px] w-full items-center gap-3 px-1 py-2 text-left disabled:opacity-50"
          >
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-[15px] font-medium text-ink">답변 완료 알림</span>
              <span className="text-xs leading-4 text-ink-sub">
                {canNotify
                  ? '다른 탭이나 앱을 쓰는 동안 답변이 오면 시스템 알림으로 알려 드려요'
                  : '이 브라우저에서는 알림을 띄울 수 없어요. 답변이 오면 탭 제목에 표시해 드려요'}
              </span>
            </span>
            <span
              aria-hidden
              className={`flex h-[26px] w-[44px] shrink-0 items-center rounded-full p-[3px] transition-colors ${
                notifyOn ? 'bg-brand' : 'bg-surface-2'
              }`}
            >
              <span
                className={`h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${notifyOn ? 'translate-x-[18px]' : ''}`}
              />
            </span>
          </button>
        </Section>

        <Section title="정보">
          {[
            { label: '시작하기 다시 보기', to: '/onboarding' },
            { label: '이용약관', to: '/terms' },
            { label: '개인정보처리방침', to: '/privacy' },
          ].map((row) => (
            <button
              key={row.to}
              type="button"
              onClick={() => navigate(row.to)}
              className="flex min-h-[56px] w-full items-center gap-3 px-1 text-left text-[15px] font-medium text-ink"
            >
              <span className="flex-1">{row.label}</span>
              <ChevronRight size={18} strokeWidth={2} aria-hidden className="text-ink-muted" />
            </button>
          ))}
          <div className="flex min-h-[56px] items-center px-1 text-[15px]">
            <span className="flex-1">앱 버전</span>
            <span className="text-[13px] text-ink-sub">{APP_VERSION}</span>
          </div>
        </Section>

        {isUser && (
          <button
            type="button"
            onClick={() => setConfirmLogout(true)}
            className="self-center p-2 text-sm text-ink-sub underline underline-offset-[3px]"
          >
            로그아웃
          </button>
        )}
      </div>

      <ConfirmDialog
        open={confirmLogout}
        title="로그아웃할까요?"
        confirmLabel="로그아웃"
        onConfirm={doLogout}
        onCancel={() => setConfirmLogout(false)}
      >
        로그아웃하면 이 기기에서는 새 게스트로 시작돼요. 지금 계정의 상담 기록은 다시 로그인하면 볼 수 있어요.
      </ConfirmDialog>

      <ConfirmDialog
        open={linkFail != null}
        title={linkFail?.title ?? ''}
        confirmLabel="확인"
        cancelLabel={null}
        onConfirm={() => setLinkFail(null)}
        onCancel={() => setLinkFail(null)}
      >
        {linkFail?.message}
      </ConfirmDialog>
    </main>
  )
}

const METHOD_LABEL: Record<LoginMethod, string> = { EMAIL: '이메일', KAKAO: '카카오', GOOGLE: 'Google' }

/** 로그인 수단 한 줄: 아이콘 · 이름 · 설명 · 오른쪽 상태 */
function MethodRow({ icon, name, sub, action }: { icon: ReactNode; name: string; sub: string; action: ReactNode }) {
  return (
    <div className="flex min-h-[72px] items-center gap-3 border-t border-surface-2 px-1 py-2.5 first:border-t-0">
      {icon}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-base font-bold leading-[22px]">{name}</span>
        <span className="truncate text-[13px] leading-[18px] text-ink-sub">{sub}</span>
      </span>
      {action}
    </div>
  )
}

function LinkedMark() {
  return (
    <span className="flex shrink-0 items-center gap-1 text-sm font-bold text-success">
      <Check size={16} strokeWidth={2.6} aria-hidden />
      연결됨
    </span>
  )
}

function ActionButton({ onClick, children }: { onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-h-10 shrink-0 rounded-xl bg-brand-soft px-3.5 text-sm font-bold text-brand-strong"
    >
      {children}
    </button>
  )
}

function SocialMethodRow({ code, linked }: { code: SocialProviderCode; linked: boolean }) {
  const name = PROVIDER_NAME[code]
  return (
    <MethodRow
      icon={
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
            code === 'KAKAO' ? 'bg-[#fee500] text-[#191600]' : 'border-[1.5px] border-line bg-white'
          }`}
        >
          <SocialIcon code={code} />
        </span>
      }
      name={name}
      sub={linked ? '연결됨' : `연결하면 ${name}로도 로그인할 수 있어요`}
      action={linked ? <LinkedMark /> : <ActionButton onClick={() => startSocialLink(code)}>연결하기</ActionButton>}
    />
  )
}

/** 계정 줄 아래 글: 이메일(이름이 위에 있을 때) · 로그인 수단 */
function accountSub(me: Me) {
  const methods = me.loginMethods.length ? `${me.loginMethods.map((m) => METHOD_LABEL[m]).join('·')} 로그인` : null
  return [me.name ? me.email : null, methods].filter(Boolean).join(' · ') || '로그인 중'
}
