import { ChevronDown } from 'lucide-react'
import { useId } from 'react'
import { categoryLabel, type PublicFaq } from '../../api/faq'

interface Props {
  faq: PublicFaq
  open: boolean
  onToggle: () => void
  /** 상담에서 눌러 들어온 FAQ: 맨 위에 테두리로 강조한다 */
  pinned?: boolean
}

/** 질문을 누르면 답변이 펼쳐지는 FAQ 한 줄 */
export default function FaqItem({ faq, open, onToggle, pinned = false }: Props) {
  const answerId = useId()
  return (
    <li className={`rounded-card bg-surface ${pinned ? 'ring-[1.5px] ring-brand' : ''}`}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={answerId}
        onClick={onToggle}
        className="flex w-full items-start gap-3 px-4 py-3.5 text-left"
      >
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="flex items-center gap-1.5 text-xs font-bold text-brand-strong">
            {categoryLabel(faq.category)}
            {pinned && <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[11px]">상담에서 참고한 정보</span>}
          </span>
          <span className="text-[15px] font-semibold leading-[22px] text-ink">{faq.question}</span>
        </span>
        <ChevronDown
          size={18}
          strokeWidth={2}
          aria-hidden
          className={`mt-5 shrink-0 text-ink-muted transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div id={answerId} className="mx-4 whitespace-pre-line border-t border-line pb-4 pt-3 text-sm leading-6 text-ink-sub">
          {faq.answer}
        </div>
      )}
    </li>
  )
}
