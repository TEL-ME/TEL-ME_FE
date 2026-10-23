import { ChevronRight, CircleHelp, Headset, MapPin, Phone, X } from 'lucide-react'
import { useEffect, useId } from 'react'
import { Link } from 'react-router-dom'

/**
 * 고객센터 연락처. 기본값은 0000 · 24시간이고, 배포 변수(VITE_SUPPORT_PHONE·VITE_SUPPORT_HOURS)로 바꿀 수 있다
 */
const SUPPORT = {
  phone: import.meta.env.VITE_SUPPORT_PHONE?.trim() || '0000',
  hours: import.meta.env.VITE_SUPPORT_HOURS?.trim() || '24시간 상담',
}

/** FAQ 근거 없음 답변에서 "고객센터 연결"을 누르면 뜨는 창 (백엔드 TELME-222 handoff) */
export default function HandoffDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const titleId = useId()
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])
  if (!open) return null

  const row = 'flex min-h-[60px] items-center gap-3 rounded-2xl bg-surface-2 px-3.5 py-2.5 text-left text-ink no-underline'
  const icon = 'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl'
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
      <div aria-hidden className="absolute inset-0 bg-[rgba(43,38,45,0.45)]" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-labelledby={titleId} className="tm-rise relative flex w-full max-w-[400px] flex-col gap-4 rounded-3xl bg-surface px-5 pb-5 pt-6">
        <button type="button" aria-label="닫기" onClick={onClose} className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center text-ink-muted">
          <X size={20} aria-hidden />
        </button>
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft text-brand-strong">
            <Headset size={24} strokeWidth={1.8} aria-hidden />
          </span>
          <h2 id={titleId} className="m-0 text-[19px] font-extrabold leading-[26px] tracking-[-0.3px]">
            상담원에게 물어보세요
          </h2>
          <p className="m-0 text-[14px] leading-[21px] text-ink-sub">
            무러바라가 가진 안내 자료로는
            <br />
            정확히 답하기 어려운 질문이에요.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <a href={`tel:${SUPPORT.phone.replace(/[^\d+]/g, '')}`} className={row}>
            <span className={`${icon} bg-brand text-white`}>
              <Phone size={18} strokeWidth={2} aria-hidden />
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <b className="text-[15px] leading-5">고객센터 {SUPPORT.phone}</b>
              <span className="text-xs leading-[18px] text-ink-sub">{SUPPORT.hours}</span>
            </span>
            <span className="shrink-0 text-[13px] font-bold text-brand-text">전화</span>
          </a>
          <Link to="/stores" onClick={onClose} className={row}>
            <span className={`${icon} bg-surface text-ink`}>
              <MapPin size={18} strokeWidth={2} aria-hidden />
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <b className="text-[15px] leading-5">가까운 매장 방문</b>
              <span className="text-xs leading-[18px] text-ink-sub">직원에게 바로 확인받을 수 있어요</span>
            </span>
            <ChevronRight size={18} strokeWidth={2} aria-hidden className="shrink-0 text-ink-muted" />
          </Link>
          <Link to="/faq" onClick={onClose} className={row}>
            <span className={`${icon} bg-surface text-ink`}>
              <CircleHelp size={18} strokeWidth={2} aria-hidden />
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <b className="text-[15px] leading-5">자주 묻는 질문 보기</b>
              <span className="text-xs leading-[18px] text-ink-sub">비슷한 안내가 있는지 찾아보세요</span>
            </span>
            <ChevronRight size={18} strokeWidth={2} aria-hidden className="shrink-0 text-ink-muted" />
          </Link>
        </div>

        <button type="button" onClick={onClose} className="min-h-[52px] rounded-2xl bg-inverse text-base font-bold text-inverse-ink">
          확인
        </button>
      </div>
    </div>
  )
}
