import { MapIcon, MessageCircle, Settings, UserRound, type LucideIcon } from 'lucide-react'
import { NavLink, Navigate, Outlet, useLocation } from 'react-router-dom'
import Toast from '../components/Toast'
import LoginSheet from '../features/auth/LoginSheet'
import { useChatRun } from '../features/chat/chatRunStore'
import DislikeSheet from '../features/feedback/DislikeSheet'
import { hasOnboarded } from '../features/onboarding/onboardingFlag'

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  match: (path: string) => boolean
}

/**
 * 모바일 앱 틀: 화면 + 하단 메뉴. 넓은 화면에서도 폭 480px로 가운데에 둔다.
 */
export default function AppLayout() {
  const { pathname } = useLocation()
  // "상담"을 누르면 보던 대화로 돌아간다
  const lastSessionId = useChatRun((s) => s.sessionId)

  // 처음 온 기기는 상담 홈 대신 시작하기부터
  if (pathname === '/' && !hasOnboarded()) return <Navigate to="/onboarding" replace />

  const nav: NavItem[] = [
    {
      to: lastSessionId ? `/chat/${lastSessionId}` : '/',
      label: '상담',
      icon: MessageCircle,
      match: (p) => p === '/' || p.startsWith('/chat'),
    },
    { to: '/stores', label: '매장', icon: MapIcon, match: (p) => p.startsWith('/stores') },
    { to: '/my', label: '마이', icon: UserRound, match: (p) => p.startsWith('/my') },
    { to: '/settings', label: '설정', icon: Settings, match: (p) => p.startsWith('/settings') },
  ]

  return (
    <div className="relative mx-auto flex h-full max-w-[480px] flex-col overflow-hidden bg-bg">
      <div className="flex min-h-0 flex-1 flex-col">
        <Outlet />
      </div>
      <nav aria-label="주요 메뉴" className="shrink-0 bg-surface pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto flex max-w-[480px]">
          {nav.map(({ to, label, icon: Icon, match }) => {
            const active = match(pathname)
            return (
              <NavLink
                key={label}
                to={to}
                aria-current={active ? 'page' : undefined}
                className={`flex flex-1 flex-col items-center gap-1 pb-3 pt-2.5 text-xs ${
                  active ? 'font-bold text-ink' : 'font-medium text-ink-muted'
                }`}
              >
                <Icon size={24} strokeWidth={1.8} fill={active ? 'currentColor' : 'none'} aria-hidden />
                {label}
              </NavLink>
            )
          })}
        </div>
      </nav>
      <DislikeSheet />
      <LoginSheet />
      <Toast />
    </div>
  )
}
