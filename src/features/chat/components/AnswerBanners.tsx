import { ChevronRight, X } from 'lucide-react'
import { useEffect } from 'react'
import avatarImg from '../../../assets/mudo/mudo-avatar.png'
import { dismissBanner, OUTCOME_TEXT, openBanner, useAnswerBanners, type AnswerBanner } from '../answerNotifier'

/** 알림이 떠 있는 시간 */
const SHOW_MS = 6000

const DOT: Record<AnswerBanner['outcome'], string> = {
  answered: 'bg-success',
  clarify: 'bg-brand',
  failed: 'bg-danger',
}

function Banner({ banner }: { banner: AnswerBanner }) {
  useEffect(() => {
    const timer = window.setTimeout(() => dismissBanner(banner.id), SHOW_MS)
    return () => window.clearTimeout(timer)
  }, [banner.id])

  return (
    <div className="tm-drop pointer-events-auto flex w-full max-w-[456px] items-center rounded-2xl border border-line bg-surface shadow-[0_10px_30px_rgba(0,0,0,0.14)]">
      <button
        type="button"
        onClick={() => openBanner(banner)}
        className="flex min-h-[64px] min-w-0 flex-1 items-center gap-3 py-2.5 pl-3 pr-1 text-left"
      >
        <img src={avatarImg} alt="" className="h-10 w-10 shrink-0 rounded-full bg-brand-soft object-cover" />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-[15px] font-bold leading-5 text-ink">{banner.title}</span>
          <span className="flex items-center gap-1.5 text-[13px] leading-[18px] text-ink-sub">
            <span aria-hidden className={`h-1.5 w-1.5 shrink-0 rounded-full ${DOT[banner.outcome]}`} />
            {OUTCOME_TEXT[banner.outcome]}
          </span>
        </span>
        <ChevronRight size={18} strokeWidth={2} aria-hidden className="shrink-0 text-ink-muted" />
      </button>
      <button
        type="button"
        aria-label="알림 닫기"
        onClick={() => dismissBanner(banner.id)}
        className="flex h-11 w-11 shrink-0 items-center justify-center text-ink-muted"
      >
        <X size={18} strokeWidth={2} aria-hidden />
      </button>
    </div>
  )
}

/**
 * 다른 화면에 있을 때 답변이 오면 화면 위에서 내려오는 알림.
 * 기다리는 대화가 여럿일 수 있어 대화 제목과 결과(답변 완료 · 추가 정보 필요 · 실패)를 보여 주고, 누르면 그 대화로 간다
 */
export default function AnswerBanners() {
  const items = useAnswerBanners((s) => s.items)
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="답변 알림"
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex flex-col items-center gap-2 px-3 pt-[calc(env(safe-area-inset-top)+10px)]"
    >
      {items.map((b) => (
        <Banner key={b.id} banner={b} />
      ))}
    </div>
  )
}
