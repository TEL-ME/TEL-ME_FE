import { MapIcon, MessageCircle, Settings, UserRound, type LucideIcon } from 'lucide-react'
import { useEffect } from 'react'
import { NavLink, Navigate, Outlet, useLocation } from 'react-router-dom'
import Toast from '../components/Toast'
import LoginSheet from '../features/auth/LoginSheet'
import { clearUnread, useUnreadAnswers } from '../features/chat/answerNotifier'
import { useBackgroundRuns, useChatRun } from '../features/chat/chatRunStore'
import DislikeSheet from '../features/feedback/DislikeSheet'
import { hasOnboarded } from '../features/onboarding/onboardingFlag'

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  match: (path: string) => boolean
  badge?: ChatBadge
}

/** 하단 메뉴 "상담" 표시: 보고 있지 않은 대화의 답변을 만드는 중 · 답변 도착 */
type ChatBadge = 'generating' | 'arrived' | null

function NavBadge({ badge }: { badge: ChatBadge }) {
  if (badge === 'arrived') {
    return <span aria-hidden className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-danger ring-2 ring-surface" />
  }
  if (badge === 'generating') {
    return (
      <span aria-hidden className="absolute -right-3 -top-1 flex gap-[2px]">
        {[0, 0.15, 0.3].map((delay) => (
          <span key={delay} className="tm-dot h-1 w-1 rounded-full bg-brand" style={{ animationDelay: `${delay}s` }} />
        ))}
      </span>
    )
  }
  return null
}

const BADGE_LABEL: Record<Exclude<ChatBadge, null>, string> = { generating: '답변 준비 중', arrived: '새 답변' }

/** 보고 있는 대화가 아닌 곳에서 답변을 만드는 중이면 점 세 개, 열어 보지 않은 답변이 있으면 점 하나 */
function useChatBadge(pathname: string): ChatBadge {
  const runSessionId = useChatRun((s) => s.sessionId)
  const runStatus = useChatRun((s) => s.status)
  const backgroundCount = useBackgroundRuns((s) => s.ids.length)
  const unread = useUnreadAnswers((s) => s.ids)
  const viewingId = /^\/chat\/\d+$/.test(pathname) ? Number(pathname.slice('/chat/'.length)) : null

  // 그 대화를 열면 도착 표시를 지운다
  useEffect(() => {
    if (viewingId != null) clearUnread(viewingId)
  }, [viewingId, unread])

  if (unread.some((id) => id !== viewingId)) return 'arrived'
  // 메인(/)에서 보낸 첫 질문은 주소가 바뀌기 전까지 메인 화면에서 보고 있다
  const viewingRun = pathname === '/' || viewingId === runSessionId
  const foreground = (runStatus === 'sending' || runStatus === 'thinking') && !viewingRun
  return foreground || backgroundCount > 0 ? 'generating' : null
}

/**
 * 모바일 앱 틀: 화면 + 하단 메뉴. 넓은 화면에서도 폭 480px로 가운데에 둔다.
 */
export default function AppLayout() {
  const { pathname } = useLocation()
  // "상담"을 누르면 보던 대화로 돌아간다
  const lastSessionId = useChatRun((s) => s.sessionId)
  const chatBadge = useChatBadge(pathname)

  // 처음 온 기기는 상담 홈 대신 시작하기부터
  if (pathname === '/' && !hasOnboarded()) return <Navigate to="/onboarding" replace />

  const nav: NavItem[] = [
    {
      to: lastSessionId ? `/chat/${lastSessionId}` : '/',
      label: '상담',
      icon: MessageCircle,
      match: (p) => p === '/' || p.startsWith('/chat'),
      badge: chatBadge,
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
          {nav.map(({ to, label, icon: Icon, match, badge }) => {
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
                <span className="relative">
                  <Icon size={24} strokeWidth={1.8} fill={active ? 'currentColor' : 'none'} aria-hidden />
                  {badge && <NavBadge badge={badge} />}
                </span>
                {label}
                {badge && <span className="sr-only">, {BADGE_LABEL[badge]}</span>}
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
