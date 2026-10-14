interface FollowUpsProps {
  items: string[]
  disabled: boolean
  onAsk: (question: string) => void
  /** 되묻기 선택지면 개수 제한 없이 모두 보여 준다 (추천 질문은 최대 3개) */
  choices?: boolean
}

/** 후속 질문 (문서 9번): 최대 3개, 누르면 바로 보낸다. 답변 생성 중에는 비활성 */
export default function FollowUps({ items, disabled, onAsk, choices = false }: FollowUpsProps) {
  const filled = items.filter((s) => s.trim())
  const list = choices ? filled : filled.slice(0, 3)
  if (list.length === 0) return null
  return (
    <div className="flex flex-wrap gap-2">
      {list.map((q) => (
        <button
          key={q}
          type="button"
          disabled={disabled}
          onClick={() => onAsk(q)}
          className="min-h-9 rounded-full bg-surface px-3.5 py-1.5 text-sm font-semibold leading-5 text-ink disabled:opacity-50"
        >
          {q}
        </button>
      ))}
    </div>
  )
}
