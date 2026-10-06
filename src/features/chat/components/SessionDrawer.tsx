import { useEffect, type ComponentProps } from 'react'
import SessionList from './SessionList'

type SessionDrawerProps = Omit<ComponentProps<typeof SessionList>, 'onClose'> & {
  open: boolean
  onClose: () => void
}

/** 왼쪽에서 나오는 대화 목록 (화면 폭과 관계없이 드로어) */
export default function SessionDrawer({ open, onClose, ...listProps }: SessionDrawerProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="absolute inset-0 z-40">
      <button
        type="button"
        aria-label="대화 목록 닫기"
        onClick={onClose}
        className="absolute inset-0 bg-[rgba(30,18,26,0.36)]"
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="대화 목록"
        className="tm-rise absolute inset-y-0 left-0 w-[84%] max-w-[340px] bg-bg shadow-[0_24px_60px_rgba(120,60,90,0.12)]"
      >
        <SessionList {...listProps} onClose={onClose} />
      </aside>
    </div>
  )
}
