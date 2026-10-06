interface FollowUpsProps {
  items: string[]
  disabled: boolean
  onAsk: (question: string) => void
}

/** 후속 질문 (문서 9번): 최대 3개, 누르면 바로 보낸다. 답변 생성 중에는 비활성 */
export default function FollowUps({ items, disabled, onAsk }: FollowUpsProps) {
  const list = items.filter((s) => s.trim()).slice(0, 3)
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
