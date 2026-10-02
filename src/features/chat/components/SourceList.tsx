import { useQuery } from '@tanstack/react-query'
import { ChevronDown } from 'lucide-react'
import { useId, useState } from 'react'
import { chatApi } from '../../../api/chat'

/**
 * 답변 아래 "참고한 정보 N개" 접기·펼치기 (문서 8번). FAQ 제목만 보이고 유사도 점수는 숨긴다.
 * 출처가 없으면 아무것도 그리지 않는다.
 */
export default function SourceList({ messageId }: { messageId: number }) {
  const [open, setOpen] = useState(false)
  const listId = useId()
  const { data } = useQuery({
    queryKey: ['chat', 'sources', messageId],
    queryFn: () => chatApi.getSources(messageId),
    staleTime: Infinity,
  })
  const sources = [...(data?.sources ?? [])].sort((a, b) => a.searchRank - b.searchRank)
  if (sources.length === 0) return null

  return (
    <div className="mt-3.5">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-[13px] font-semibold leading-[18px] text-ink-sub"
      >
        참고한 정보 {sources.length}개
        <ChevronDown
          size={14}
          strokeWidth={2}
          aria-hidden
          className={`transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <ol id={listId} className="mt-2 flex flex-col gap-1.5">
          {sources.map((s, i) => (
            <li
              key={s.faqId}
              className="flex items-center gap-2 rounded-[10px] bg-surface-2 px-2.5 py-2 text-sm leading-5"
            >
              <b className="min-w-3 text-xs text-brand-text">{i + 1}</b>
              {s.title}
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
