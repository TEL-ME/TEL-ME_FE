import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { useId, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { chatApi } from '../../../api/chat'
import { faqApi } from '../../../api/faq'
import { GONE_FAQ_MESSAGE, markFaqGone, useGoneFaqs } from '../../faq/goneFaqs'
import { faqDetailKey, isFaqGone } from '../../faq/queries'
import { showToast } from '../../../stores/toastStore'
import { track } from '../../../lib/analytics'

/**
 * 답변 아래 "참고한 정보 N개" 접기·펼치기 (문서 8번). FAQ 제목만 보이고 유사도 점수는 숨긴다.
 * 제목을 누르면 FAQ 화면에서 그 질문을 펼쳐 보여준다. 숨김·삭제된 FAQ면 알리고 흐리게 둔다.
 * 출처가 없으면 아무것도 그리지 않는다.
 */
export default function SourceList({ messageId, trailing }: { messageId: number; trailing?: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [opening, setOpening] = useState<number | null>(null)
  const listId = useId()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const goneIds = useGoneFaqs((s) => s.ids)
  const { data } = useQuery({
    queryKey: ['chat', 'sources', messageId],
    queryFn: () => chatApi.getSources(messageId),
    staleTime: Infinity,
  })
  const sources = [...(data?.sources ?? [])].sort((a, b) => a.searchRank - b.searchRank)
  // 출처가 없으면 오른쪽 끝 버튼(듣기)만 남긴다
  if (sources.length === 0) return trailing ? <div className="-mb-1 mt-2 flex justify-end">{trailing}</div> : null

  const openFaq = async (faqId: number) => {
    if (goneIds.includes(faqId)) {
      showToast(GONE_FAQ_MESSAGE)
      return
    }
    if (opening != null) return
    setOpening(faqId)
    try {
      // 먼저 받아 두면 FAQ 화면이 바로 그 질문을 보여준다
      await queryClient.fetchQuery({ queryKey: faqDetailKey(faqId), queryFn: () => faqApi.detail(faqId), staleTime: 60_000 })
      navigate(`/faq?id=${faqId}`)
    } catch (e) {
      if (isFaqGone(e)) {
        markFaqGone(faqId)
        showToast(GONE_FAQ_MESSAGE)
      } else {
        showToast('FAQ를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.')
      }
    } finally {
      setOpening(null)
    }
  }

  return (
    <div className="mt-3.5">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={listId}
          onClick={() => {
            if (!open) track('faq_source_open')
            setOpen((v) => !v)}}
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
        {trailing}
      </div>
      {open && (
        <ol id={listId} className="mt-2 flex flex-col gap-1.5">
          {sources.map((s, i) => {
            const gone = goneIds.includes(s.faqId)
            return (
              <li key={s.faqId}>
                <button
                  type="button"
                  onClick={() => void openFaq(s.faqId)}
                  aria-busy={opening === s.faqId}
                  className={`flex w-full items-center gap-2 rounded-[10px] bg-surface-2 px-2.5 py-2 text-left text-sm leading-5 ${
                    gone ? 'text-ink-muted' : ''
                  }`}
                >
                  <b className={`min-w-3 text-xs ${gone ? 'text-ink-muted' : 'text-brand-text'}`}>{i + 1}</b>
                  <span className={`min-w-0 flex-1 ${gone ? 'line-through' : ''}`}>{s.title}</span>
                  {gone ? (
                    <span className="shrink-0 text-xs">삭제됨</span>
                  ) : (
                    <ChevronRight size={16} strokeWidth={2} aria-hidden className="shrink-0 text-ink-muted" />
                  )}
                </button>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}
