import type { ReactNode } from 'react'
import avatarImg from '../../../assets/home/mudo-headset.png'

export function UserBubble({ children }: { children: ReactNode }) {
  return (
    <div className="tm-rise flex justify-end">
      <div className="max-w-[82%] whitespace-pre-line rounded-[22px] rounded-br-md bg-brand px-4 py-3 text-[15px] leading-6 text-white">
        {children}
      </div>
    </div>
  )
}

/** default: 일반 답변 · ask: 조건 확인(추가 질문) · notice: 근거 없음·범위 밖 · error: 실패 */
export type BotTone = 'default' | 'ask' | 'notice' | 'error'

const TONE: Record<BotTone, { bubble: string; meta: string }> = {
  default: { bubble: 'bg-surface', meta: 'text-ink-muted' },
  ask: { bubble: 'bg-surface border-[1.5px] border-brand', meta: 'text-brand-text' },
  notice: { bubble: 'bg-notice', meta: 'text-notice-text' },
  error: { bubble: 'bg-surface', meta: 'text-danger' },
}

interface BotBubbleProps {
  children: ReactNode
  /** 말풍선 위쪽 작은 제목 (예: 조건 확인) */
  meta?: string
  tone?: BotTone
  /** 말풍선 바로 아래, 말풍선 폭에 맞춰 붙는 줄 (평가 버튼 · 상담 종료). 오른쪽 끝이 말풍선 끝과 맞는다 */
  actions?: ReactNode
  /** 그 아래 줄 (후속 질문 등) */
  after?: ReactNode
}

export function BotBubble({ children, meta, tone = 'default', actions, after }: BotBubbleProps) {
  const t = TONE[tone]
  return (
    <div className="tm-rise flex flex-col">
      <div className="flex items-start gap-2.5">
        <div aria-hidden className="flex h-9 w-9 shrink-0 justify-center overflow-hidden rounded-full bg-brand-soft">
          <img src={avatarImg} alt="" className="mt-[18%] w-[130%] max-w-none" />
        </div>
        <div className="flex max-w-[82%] flex-col gap-2">
          <div className={`rounded-[22px] rounded-tl-md px-4 py-3 text-[15px] leading-6 ${t.bubble}`}>
            {meta && <p className={`mb-1.5 text-xs font-bold leading-4 ${t.meta}`}>{meta}</p>}
            {children}
          </div>
          {actions && <div className="flex min-w-max items-center gap-2">{actions}</div>}
        </div>
      </div>
      {after && <div className="mt-2 pl-[46px]">{after}</div>}
    </div>
  )
}
