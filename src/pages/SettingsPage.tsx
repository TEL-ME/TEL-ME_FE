import { ChevronRight, Link2 } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import ConfirmDialog from '../components/ConfirmDialog'
import avatarImg from '../assets/mudo/mudo-avatar.png'
import { openLoginSheet } from '../features/auth/loginSheetStore'
import { logout, useMe } from '../features/auth/useAuth'
import { useThemeStore, type ThemeSetting } from '../stores/themeStore'
import { showToast } from '../stores/toastStore'

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
  const { me, isUser } = useMe()
  const navigate = useNavigate()
  const [confirmLogout, setConfirmLogout] = useState(false)

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
                {isUser ? (me.name ? `${me.name} 님` : (me.email ?? '카카오 계정')) : '게스트로 이용 중'}
              </strong>
              <span className="text-xs leading-4 text-ink-sub">
                {isUser ? (me.name && me.email ? me.email : '로그인 중') : '로그인하면 상담 기록이 내 계정에 저장돼요'}
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
    </main>
  )
}
