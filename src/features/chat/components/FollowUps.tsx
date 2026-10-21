import { ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAllPlans } from '../../plans/queries'
import { parsePlanTaskLink, planTaskHref } from '../planTaskLinks'

interface FollowUpsProps {
  items: string[]
  disabled: boolean
  onAsk: (question: string) => void
  /** 되묻기 선택지면 개수 제한 없이 모두 보여 준다 (추천 질문은 최대 3개) */
  choices?: boolean
}

/**
 * 후속 질문 (문서 9번): 최대 3개, 누르면 바로 보낸다. 답변 생성 중에는 비활성.
 * 요금제 업무 링크(planTaskLinks)는 채팅으로 보내지 않고 처리 화면으로 이동하며, 3개 제한에 세지 않는다.
 * 요금제 이름이 붙은 링크는 그 요금제를 고른 채로 요금제 고르기 화면을 연다.
 */
export default function FollowUps({ items, disabled, onAsk, choices = false }: FollowUpsProps) {
  const navigate = useNavigate()
  const filled = items.filter((s) => s.trim())
  const links = filled.filter((s) => parsePlanTaskLink(s))
  const questions = filled.filter((s) => !parsePlanTaskLink(s))
  // 요금제 이름이 붙은 링크("5G 스탠다드 변경하러 가기")가 있을 때만 요금제 목록을 읽어 planId를 찾는다
  const plans = useAllPlans(links.some((s) => parsePlanTaskLink(s)?.planName))
  const go = (label: string) => {
    const link = parsePlanTaskLink(label)
    if (link) navigate(planTaskHref(link, plans.data ?? []))
  }
  const list = choices ? questions : questions.slice(0, 3)
  if (list.length === 0 && links.length === 0) return null
  return (
    <div className="flex flex-wrap gap-2">
      {links.map((label) => (
        <button
          key={label}
          type="button"
          onClick={() => go(label)}
          className="inline-flex min-h-9 items-center gap-0.5 rounded-full bg-brand-soft py-1.5 pl-3.5 pr-2.5 text-sm font-bold leading-5 text-brand-strong"
        >
          {label}
          <ChevronRight size={16} strokeWidth={2.4} aria-hidden />
        </button>
      ))}
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
