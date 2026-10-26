import { LoaderCircle, Square, Volume2 } from 'lucide-react'
import { toggleSpeech, useSpeechPlayer } from './speechPlayer'

/**
 * 답변 아래 "듣기" 버튼. 누르면 음성을 받아 재생하고, 재생 중에 누르면 멈춘다.
 * 말풍선 안 오른쪽 아래에 작게 둔다 (선택지·평가 버튼과 구분)
 */
export default function ListenButton({ messageId }: { messageId: number }) {
  const status = useSpeechPlayer((s) => (s.messageId === messageId ? s.status : 'idle'))
  const label = status === 'loading' ? '음성 불러오는 중' : status === 'playing' ? '듣기 멈추기' : '답변 듣기'
  const on = status !== 'idle'
  return (
    <button
      type="button"
      aria-label={label}
      aria-busy={status === 'loading' || undefined}
      onClick={() => void toggleSpeech(messageId)}
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${on ? 'bg-brand-soft text-brand-strong' : 'bg-surface-2 text-ink-sub'}`}
    >
      {status === 'loading' ? (
        <LoaderCircle size={16} strokeWidth={2} aria-hidden className="animate-spin" />
      ) : status === 'playing' ? (
        <Square size={13} strokeWidth={2} fill="currentColor" aria-hidden />
      ) : (
        <Volume2 size={16} strokeWidth={1.8} aria-hidden />
      )}
    </button>
  )
}
