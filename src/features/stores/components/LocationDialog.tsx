import { LocateFixed } from 'lucide-react'
import { useEffect, useId, useRef } from 'react'

interface LocationDialogProps {
  open: boolean
  /** 허용하고 찾기 → 브라우저의 위치 권한 창으로 이어진다 */
  onAllow: () => void
  /** 지역으로 찾기 */
  onRegion: () => void
  onClose: () => void
}

/** 현재 위치 버튼을 눌렀을 때 먼저 묻는 창. 여기서 허용해야 브라우저 권한 창이 뜬다 */
export default function LocationDialog({ open, onAllow, onRegion, onClose }: LocationDialogProps) {
  const titleId = useId()
  const allowRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    allowRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center px-6">
      <button type="button" aria-label="닫기" onClick={onClose} className="absolute inset-0 bg-[rgba(43,38,45,0.45)]" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="tm-rise relative flex w-full max-w-[400px] flex-col items-center gap-2 rounded-3xl bg-surface px-5 pb-5 pt-6 text-center"
      >
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-soft text-brand-text">
          <LocateFixed size={28} strokeWidth={1.8} aria-hidden />
        </span>
        <h2 id={titleId} className="mt-1.5 text-xl font-extrabold leading-7 tracking-[-0.3px]">
          현재 위치를 사용할까요?
        </h2>
        <p className="mb-2.5 text-sm leading-[22px] text-ink-sub">
          허용하면 가까운 매장부터 보여드려요.
          <br />
          허용하지 않아도 지역으로 찾을 수 있어요.
        </p>
        <div className="flex flex-col gap-2 self-stretch">
          <button
            ref={allowRef}
            type="button"
            onClick={onAllow}
            className="min-h-[52px] rounded-2xl bg-brand text-base font-bold text-white"
          >
            허용하고 찾기
          </button>
          <button type="button" onClick={onRegion} className="min-h-[52px] rounded-2xl bg-surface-2 text-base font-bold text-ink">
            지역으로 찾기
          </button>
        </div>
      </div>
    </div>
  )
}
