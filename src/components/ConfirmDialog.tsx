import { useEffect, useId, useRef, type ReactNode } from 'react'

interface ConfirmDialogProps {
  open: boolean
  title: string
  children?: ReactNode
  confirmLabel: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  cancelLabel = '취소',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const titleId = useId()
  const cancelRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    cancelRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCancel()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onCancel])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
      <div aria-hidden className="absolute inset-0 bg-[rgba(43,38,45,0.45)]" onClick={onCancel} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="tm-rise relative flex w-full max-w-[400px] flex-col gap-2.5 rounded-3xl bg-surface px-5 pb-5 pt-6"
      >
        <h2 id={titleId} className="text-[19px] font-extrabold leading-[26px] tracking-[-0.3px]">
          {title}
        </h2>
        {children && <div className="text-[15px] leading-[23px] text-ink-sub">{children}</div>}
        <div className="mt-2.5 flex gap-2">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className="min-h-[52px] flex-1 rounded-2xl bg-surface-2 text-base font-bold text-ink"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="min-h-[52px] flex-1 rounded-2xl bg-inverse text-base font-bold text-inverse-ink"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
