import { ArrowUp } from 'lucide-react'
import { useState, type FormEvent, type KeyboardEvent } from 'react'

interface ComposerProps {
  busy: boolean
  placeholder?: string
  /** 있으면 입력을 막고 이 문구를 보여 준다 (예: 일시 제한 남은 시간) */
  lockedText?: string | null
  onSend: (question: string) => void
}

const MAX_LENGTH = 300

export default function Composer({ busy: generating, placeholder = '어떤 것이 궁금하세요?', lockedText, onSend }: ComposerProps) {
  const [value, setValue] = useState('')
  const busy = generating || !!lockedText
  const canSend = !busy && value.trim().length > 0

  const submit = () => {
    if (!canSend) return
    onSend(value)
    setValue('')
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    submit()
  }

  // 한글 조합 중 Enter는 글자 확정용이라 보내지 않는다
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      aria-label="질문 보내기"
      className={`flex items-center gap-3 rounded-[28px] py-2 pl-5 pr-2 ${busy ? 'bg-field-disabled' : 'bg-surface'}`}
    >
      <input
        aria-label="질문 입력"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={onKeyDown}
        disabled={busy}
        enterKeyHint="send"
        maxLength={MAX_LENGTH}
        placeholder={lockedText || (generating ? '무러바라가 답변을 준비하고 있어요' : placeholder)}
        className="min-w-0 flex-1 bg-transparent py-2.5 text-base leading-6 text-ink outline-none placeholder:text-ink-muted"
      />
      <button
        type="submit"
        aria-label="보내기"
        disabled={!canSend}
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
          busy ? 'bg-line text-ink-muted' : 'bg-brand text-white'
        } disabled:cursor-default`}
      >
        <ArrowUp size={22} strokeWidth={2.2} aria-hidden />
      </button>
    </form>
  )
}
