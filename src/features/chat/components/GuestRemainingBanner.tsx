import { MessageCircleQuestionMark } from 'lucide-react'
import { openLoginSheet } from '../../auth/loginSheetStore'
import { GUEST_LIMIT_LOGIN_NOTE, LOW_REMAINING, useGuestLimit } from '../guestLimitStore'

/**
 * 게스트의 오늘 남은 질문이 얼마 안 남았을 때 입력창 위에 두는 안내 (TELME-213).
 * 한도에 걸리기 전에 로그인을 권한다. 0이 되면 입력창 자리가 GuestLimitPanel로 바뀐다
 */
export default function GuestRemainingBanner() {
  const remaining = useGuestLimit((s) => s.remaining)
  if (remaining == null || remaining <= 0 || remaining > LOW_REMAINING) return null
  return (
    <div role="status" className="flex items-center gap-2 rounded-2xl bg-surface py-1.5 pl-3.5 pr-1.5 text-[13px] leading-5 text-ink-sub">
      <MessageCircleQuestionMark size={16} strokeWidth={2} aria-hidden className="shrink-0 text-brand-text" />
      <span className="min-w-0 flex-1 truncate">
        <b className="font-bold text-ink">오늘 남은 질문 {remaining}회</b> · 로그인하면 제한 없이
      </span>
      <button
        type="button"
        onClick={() => openLoginSheet({ subtitle: GUEST_LIMIT_LOGIN_NOTE })}
        className="min-h-8 shrink-0 rounded-xl bg-brand-soft px-3 text-[13px] font-bold text-brand-strong"
      >
        로그인
      </button>
    </div>
  )
}
