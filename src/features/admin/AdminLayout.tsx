import { useQueryClient } from '@tanstack/react-query'
import { HeartPulse, LayoutDashboard, MessageSquareWarning, NotebookText, Store } from 'lucide-react'
import { Link, Navigate, NavLink, Outlet, useNavigate } from 'react-router-dom'
import mudoImg from '../../assets/home/mudo-headset.png'
import Toast from '../../components/Toast'
import { logout, useMe } from '../auth/useAuth'
import { adminAccessKey, useAdminAccess } from './adminAccess'

const NAV: { to: string; label: string; icon: typeof Store; soon?: boolean }[] = [
  { to: '/admin/dashboard', label: '대시보드', icon: LayoutDashboard },
  { to: '/admin/quality', label: '답변 품질', icon: MessageSquareWarning },
  { to: '/admin/faqs', label: 'FAQ 관리', icon: NotebookText },
  { to: '/admin/stores', label: '매장 관리', icon: Store },
  { to: '/admin/system', label: '운영 상태', icon: HeartPulse, soon: true },
]

/** 관리자 화면 틀 (시안: 왼쪽 메뉴 232px + 본문). 들어올 때 권한을 확인한다 (문서 12번) */
export default function AdminLayout() {
  const access = useAdminAccess()
  const { me } = useMe()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  if (access.isPending) {
    return <main className="flex h-full items-center justify-center bg-bg text-sm text-ink-sub">권한 확인 중…</main>
  }
  if (access.data === 'login') return <Navigate to="/admin/login" replace />
  if (access.isError || access.data === 'forbidden') return <AdminDenied />

  const doLogout = async () => {
    await logout()
    queryClient.removeQueries({ queryKey: adminAccessKey })
    queryClient.removeQueries({ queryKey: ['admin'] })
    navigate('/admin/login', { replace: true })
  }

  return (
    <div className="h-full overflow-auto bg-bg">
      {/* 관리자 화면은 PC 기준. 좁은 화면에서는 옆으로 밀어서 본다 */}
      <p className="sticky left-0 hidden bg-inverse px-4 py-2.5 text-[13px] text-inverse-ink max-[900px]:block">
        관리자 화면은 PC용이에요. 좁은 화면에서는 옆으로 밀어서 봐 주세요.
      </p>
      <div className="flex min-h-full min-w-[1024px]">
        <aside className="sticky top-0 flex h-screen w-[232px] shrink-0 flex-col gap-5 border-r border-line bg-surface px-4 py-6">
          <div className="flex items-center gap-2 px-2">
            <span aria-label="TEL-ME" className="font-logo text-[26px] font-black tracking-[-0.8px]">
              tel<span className="text-brand-text">me</span>
            </span>
            <span className="rounded-full bg-inverse px-2 py-0.5 text-[11px] font-bold text-inverse-ink">관리자</span>
          </div>
          <nav aria-label="관리자 메뉴" className="flex flex-col gap-1">
            {NAV.map(({ to, label, icon: Icon, soon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex h-11 items-center gap-2.5 rounded-xl px-3 text-[15px] ${
                    isActive ? 'bg-brand-soft font-bold text-brand-strong' : 'font-medium text-ink-sub'
                  }`
                }
              >
                <Icon size={18} strokeWidth={1.8} aria-hidden />
                {label}
                {soon && <span className="ml-auto text-[11px] font-semibold text-ink-muted">구현 예정</span>}
              </NavLink>
            ))}
          </nav>
          <Link to="/" className="mt-auto flex h-10 items-center justify-center rounded-xl bg-surface-2 text-[13px] font-bold text-ink">
            상담 앱으로 돌아가기
          </Link>
          <div className="flex items-center gap-2.5 rounded-[14px] bg-surface-2 p-3">
            <span className="flex h-9 w-9 shrink-0 justify-center overflow-hidden rounded-full bg-brand-soft">
              <img src={mudoImg} alt="" className="mt-[18%] w-[130%] max-w-none" />
            </span>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-[13px] font-bold">{me.name ?? me.email ?? '관리자'}</span>
              <button type="button" onClick={doLogout} className="self-start text-xs text-ink-muted underline underline-offset-2">
                로그아웃
              </button>
            </div>
          </div>
        </aside>
        <main className="flex min-w-0 flex-1 flex-col gap-5 px-8 py-7">
          <Outlet />
        </main>
      </div>
      <Toast />
    </div>
  )
}

/** 권한 없음 (시안 AdminDenied) */
function AdminDenied() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const switchAccount = async () => {
    await logout()
    queryClient.removeQueries({ queryKey: adminAccessKey })
    navigate('/admin/login', { replace: true })
  }
  return (
    <main className="flex h-full flex-col items-center justify-center gap-3 bg-bg px-6 text-center">
      <img src={mudoImg} alt="" className="w-[180px]" />
      <h1 className="text-[22px] font-extrabold">관리자만 들어올 수 있어요</h1>
      <p className="text-[15px] leading-[23px] text-ink-sub">
        이 계정에는 관리자 권한이 없어요.
        <br />
        권한이 필요하면 팀 관리자에게 요청해 주세요.
      </p>
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={switchAccount} className="h-11 rounded-[14px] bg-inverse px-5 text-[15px] font-bold text-inverse-ink">
          다른 계정으로 로그인
        </button>
        <Link to="/" className="flex h-11 items-center rounded-[14px] border-[1.5px] border-line px-5 text-[15px] font-bold text-ink">
          TEL-ME 상담으로 가기
        </Link>
      </div>
    </main>
  )
}
