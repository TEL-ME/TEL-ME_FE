import { Check, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

export const TITLE_MAX = 100

interface SessionTitleEditorProps {
  initial: string
  saving: boolean
  onSave: (title: string) => void
  onCancel: () => void
}

/** 대화 목록에서 제목을 바로 고치는 입력칸. Enter 저장, Esc 취소 */
export default function SessionTitleEditor({ initial, saving, onSave, onCancel }: SessionTitleEditorProps) {
  const [value, setValue] = useState(initial)
  const inputRef = useRef<HTMLInputElement>(null)
  const trimmed = value.trim()
  const canSave = trimmed.length > 0 && trimmed.length <= TITLE_MAX && !saving

  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [])

  const submit = () => {
    if (!canSave) return
    if (trimmed === initial.trim()) onCancel()
    else onSave(trimmed)
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
      className="flex items-center gap-1.5 rounded-[14px] bg-surface px-2 py-1.5"
    >
      <input
        ref={inputRef}
        value={value}
        maxLength={TITLE_MAX}
        disabled={saving}
        aria-label="대화 제목"
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            // 드로어까지 닫히지 않게 여기서 멈춘다
            e.stopPropagation()
            e.nativeEvent.stopImmediatePropagation()
            onCancel()
          }
        }}
        className="min-h-10 min-w-0 flex-1 rounded-[10px] bg-bg px-2.5 text-sm font-semibold text-ink outline-none ring-brand focus:ring-2"
      />
      <button
        type="submit"
        aria-label="제목 저장"
        disabled={!canSave}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-brand text-white disabled:opacity-50"
      >
        <Check size={18} strokeWidth={2.2} aria-hidden />
      </button>
      <button
        type="button"
        aria-label="취소"
        onClick={onCancel}
        disabled={saving}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] text-ink-sub"
      >
        <X size={18} strokeWidth={2} aria-hidden />
      </button>
    </form>
  )
}
