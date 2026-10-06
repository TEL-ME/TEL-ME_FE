import { ChevronLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'

interface AuthScreenProps {
  title: string
  subtitle: string
  children: ReactNode
  footer: ReactNode
}

/** 이메일 로그인·회원가입 공통 틀 (하단 메뉴 없음) */
export default function AuthScreen({ title, subtitle, children, footer }: AuthScreenProps) {
  const navigate = useNavigate()
  return (
    <div className="mx-auto flex h-full max-w-[480px] flex-col bg-bg">
      <header className="flex shrink-0 items-center px-2 pt-2">
        <button
          type="button"
          aria-label="뒤로"
          onClick={() => navigate(-1)}
          className="flex h-11 w-11 items-center justify-center text-ink"
        >
          <ChevronLeft size={24} strokeWidth={2} aria-hidden />
        </button>
      </header>
      <div className="no-scrollbar flex min-h-0 flex-1 flex-col gap-7 overflow-y-auto px-5 pb-5">
        <div className="px-1 pt-3">
          <h1 className="text-[26px] font-extrabold leading-[35px] tracking-[-0.6px]">{title}</h1>
          <p className="mt-2 text-[15px] leading-[23px] text-ink-sub">{subtitle}</p>
        </div>
        {children}
      </div>
      <div className="flex shrink-0 flex-col gap-3 px-5 pb-6 pt-3">{footer}</div>
    </div>
  )
}
