import { ArrowUp, Check, LoaderCircle, Mic, X } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { speechApi } from '../../../api/speech'
import { canRecord, startRecording, type Recording } from '../../speech/recorder'
import { micErrorMessage, transcribeErrorMessage } from '../../speech/speechMessages'
import { showToast } from '../../../stores/toastStore'

interface ComposerProps {
  busy: boolean
  placeholder?: string
  /** 있으면 입력을 막고 이 문구를 보여 준다 (예: 일시 제한 남은 시간) */
  lockedText?: string | null
  onSend: (question: string) => void
}

const MAX_LENGTH = 300
/** 백엔드 음성 인식 최대 길이 */
const MAX_SECONDS = 30
/** 이보다 짧으면 보내지 않는다 (잘못 누른 경우) */
const MIN_SECONDS = 0.4
const LEVEL_BARS = 14

type VoiceState = 'off' | 'starting' | 'recording' | 'transcribing'

const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

export default function Composer({ busy: generating, placeholder = '어떤 것이 궁금하세요?', lockedText, onSend }: ComposerProps) {
  const [value, setValue] = useState('')
  const busy = generating || !!lockedText
  const canSend = !busy && value.trim().length > 0
  const inputRef = useRef<HTMLInputElement>(null)

  // ---- 음성으로 질문하기: 녹음 → 인식 → 입력창에 채운다 (자동으로 보내지 않는다) ----
  const [voice, setVoice] = useState<VoiceState>('off')
  const [elapsed, setElapsed] = useState(0)
  const [levels, setLevels] = useState<number[]>(() => Array(LEVEL_BARS).fill(0))
  const recording = useRef<Recording | null>(null)
  const startedAt = useRef(0)
  const micSupported = canRecord()

  const resetVoice = () => {
    recording.current = null
    setVoice('off')
    setElapsed(0)
    setLevels(Array(LEVEL_BARS).fill(0))
  }

  const cancelVoice = () => {
    recording.current?.cancel()
    resetVoice()
  }

  const startVoice = async () => {
    if (busy || voice !== 'off') return
    setVoice('starting')
    try {
      recording.current = await startRecording((level) => setLevels((prev) => [...prev.slice(1), level]))
      startedAt.current = Date.now()
      setVoice('recording')
    } catch (e) {
      resetVoice()
      showToast(micErrorMessage(e))
    }
  }

  const finishVoice = async () => {
    const rec = recording.current
    if (!rec) return
    recording.current = null
    setVoice('transcribing')
    try {
      const { wav, seconds } = await rec.stop()
      if (seconds < MIN_SECONDS) {
        showToast('조금 더 길게 말해 주세요')
        return
      }
      const { text } = await speechApi.transcribe(wav)
      const heard = text.trim()
      if (!heard) {
        showToast('잘 못 알아들었어요. 다시 말해 주세요')
        return
      }
      setValue((prev) => (prev.trim() ? `${prev.trimEnd()} ${heard}` : heard).slice(0, MAX_LENGTH))
      // 확인하고 고칠 수 있게 입력창으로 돌아간다
      window.setTimeout(() => inputRef.current?.focus(), 0)
    } catch (e) {
      showToast(transcribeErrorMessage(e))
    } finally {
      resetVoice()
    }
  }

  // 녹음 시간 표시, 30초가 되면 자동으로 끝낸다
  const finishRef = useRef(finishVoice)
  useEffect(() => {
    finishRef.current = finishVoice
  })
  useEffect(() => {
    if (voice !== 'recording') return
    const t = window.setInterval(() => {
      const s = (Date.now() - startedAt.current) / 1000
      setElapsed(Math.min(s, MAX_SECONDS))
      if (s >= MAX_SECONDS) void finishRef.current()
    }, 200)
    return () => window.clearInterval(t)
  }, [voice])

  // 답변 생성·입력 제한이 걸리면 녹음을 버린다. 화면을 떠날 때도 마이크를 끈다
  useEffect(() => {
    if (busy && recording.current) {
      recording.current.cancel()
      window.setTimeout(resetVoice, 0)
    }
  }, [busy])
  useEffect(() => () => recording.current?.cancel(), [])

  const submit = () => {
    if (!canSend || voice !== 'off') return
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

  if (voice === 'recording') {
    return (
      <div
        role="group"
        aria-label="음성 녹음 중"
        className="flex items-center gap-2.5 rounded-[28px] bg-surface p-2 ring-[1.5px] ring-brand"
      >
        <button
          type="button"
          aria-label="녹음 취소"
          onClick={cancelVoice}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-surface-2 text-ink-sub"
        >
          <X size={20} strokeWidth={2} aria-hidden />
        </button>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="flex items-center gap-1.5 text-sm font-bold text-brand-strong">
            <span aria-hidden className="h-2 w-2 animate-pulse rounded-full bg-danger" />
            듣고 있어요
            <span className="ml-auto font-semibold tabular-nums text-ink-muted">
              {clock(elapsed)} / {clock(MAX_SECONDS)}
            </span>
          </span>
          <span aria-hidden className="flex h-[30px] items-center gap-[3px]">
            {levels.map((l, i) => (
              <span
                key={i}
                className="w-[3px] rounded-sm bg-brand transition-[height] duration-100"
                style={{ height: `${Math.max(4, Math.round(l * 30))}px` }}
              />
            ))}
          </span>
        </div>
        <button
          type="button"
          aria-label="녹음 끝내기"
          onClick={() => void finishVoice()}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand text-white"
        >
          <Check size={22} strokeWidth={2.4} aria-hidden />
        </button>
      </div>
    )
  }

  const transcribing = voice === 'transcribing'
  const locked = busy || transcribing
  return (
    <form
      onSubmit={onSubmit}
      aria-label="질문 보내기"
      aria-busy={transcribing || undefined}
      className={`flex items-center gap-1 rounded-[28px] py-2 pl-5 pr-2 ${busy ? 'bg-field-disabled' : 'bg-surface'}`}
    >
      {transcribing ? (
        <span role="status" className="flex min-w-0 flex-1 items-center gap-2 py-2.5 text-base leading-6 text-ink-muted">
          <LoaderCircle size={18} strokeWidth={2} aria-hidden className="animate-spin" />
          알아듣는 중…
        </span>
      ) : (
        <input
          ref={inputRef}
          aria-label="질문 입력"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          disabled={busy}
          enterKeyHint="send"
          maxLength={MAX_LENGTH}
          placeholder={lockedText || (generating ? '무러바라가 답변을 준비하고 있어요' : placeholder)}
          className="mr-2 min-w-0 flex-1 bg-transparent py-2.5 text-base leading-6 text-ink outline-none placeholder:text-ink-muted"
        />
      )}
      {micSupported && (
        <button
          type="button"
          aria-label="음성으로 질문하기"
          disabled={locked || voice === 'starting'}
          onClick={() => void startVoice()}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-ink-sub disabled:text-ink-muted disabled:opacity-60"
        >
          <Mic size={22} strokeWidth={1.8} aria-hidden />
        </button>
      )}
      <button
        type="submit"
        aria-label="보내기"
        disabled={!canSend || transcribing}
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
          busy || !canSend || transcribing ? 'bg-line text-ink-muted' : 'bg-brand text-white'
        } disabled:cursor-default`}
      >
        <ArrowUp size={22} strokeWidth={2.2} aria-hidden />
      </button>
    </form>
  )
}
