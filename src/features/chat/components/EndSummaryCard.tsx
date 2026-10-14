import { RotateCw } from 'lucide-react'
import type { ReactNode } from 'react'
import noteImg from '../../../assets/my/mudo-note.png'
import type { ChatEndSummary } from '../../../api/types'
import { useEndSummary } from '../endSummaryQueries'

/** 안내 문장은 서버가 "안내받은 내용: "을 붙여 줄 수 있다. 제목이 같은 말이라 화면에서는 뗀다 */
const stripGuidance = (text: string) => text.replace(/^안내받은 내용\s*:\s*/, '')

function generatedLabel(iso: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  const time = d.toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' })
  const today = d.toDateString() === new Date().toDateString()
  return `${today ? '오늘' : `${d.getMonth() + 1}월 ${d.getDate()}일`} ${time} 정리`
}

function Shell({ sub, children, busy = false }: { sub?: ReactNode; children: ReactNode; busy?: boolean }) {
  return (
    <section aria-label="상담 요약" aria-busy={busy} className="tm-rise rounded-card bg-surface px-4 pb-4 pt-3.5">
      <header className="flex items-center gap-3">
        <img src={noteImg} alt="" className="h-12 w-12 shrink-0 object-contain" />
        <div className="flex min-w-0 flex-col">
          <h2 className="m-0 text-base font-extrabold leading-6 text-ink">상담 요약</h2>
          {sub && <p className="m-0 text-xs leading-4 text-ink-muted">{sub}</p>}
        </div>
      </header>
      <div className="mt-3">{children}</div>
    </section>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 border-t border-line pt-3 first:border-t-0 first:pt-0">
      <h3 className="m-0 text-[13px] font-bold leading-[18px] text-brand-text">{title}</h3>
      {children}
    </div>
  )
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
      {items.map((text, i) => (
        <li key={i} className="flex gap-2 text-[15px] leading-6 text-ink">
          <span aria-hidden className="mt-[10px] h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
          <span className="min-w-0 break-words">{text}</span>
        </li>
      ))}
    </ul>
  )
}

function Completed({ summary }: { summary: NonNullable<ChatEndSummary['summary']> }) {
  const topics = summary.topics.filter((t) => t.trim())
  const guidance = summary.guidance.map(stripGuidance).filter((t) => t.trim())
  // 남은 사항이 없을 때 "모두 해결됨"처럼 단정하지 않는다: 항목이 있을 때만 보여 준다. 개수 상한도 두지 않는다
  const pending = summary.pendingItems.filter((t) => t.trim())
  return (
    <div className="flex flex-col gap-3">
      {topics.length > 0 && (
        <Section title="주요 문의">
          <Bullets items={topics} />
        </Section>
      )}
      {guidance.length > 0 && (
        <Section title="안내받은 내용">
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {guidance.map((text, i) => (
              // 실제 답변의 원문 발췌라 인용처럼 보여 준다
              <li key={i} className="break-words rounded-xl bg-surface-2 px-3 py-2.5 text-sm leading-[22px] text-ink">
                {text}
              </li>
            ))}
          </ul>
        </Section>
      )}
      {pending.length > 0 && (
        <Section title="남은 사항">
          <Bullets items={pending} />
        </Section>
      )}
      <p className="m-0 text-xs leading-[18px] text-ink-muted">
        대화 기록에서 정리한 내용이에요. 자세한 안내는 위 대화를 확인해 주세요.
      </p>
    </div>
  )
}

const retryClass =
  'mt-3 flex min-h-9 items-center gap-1.5 self-start rounded-full bg-surface-2 px-3.5 text-[13px] font-bold text-ink disabled:opacity-50'

/**
 * 종료된 상담의 요약 카드 (대화 맨 아래).
 * 종료 직후에는 준비 중이라 잠시 기다렸다가 결과를 보여 준다. 요청 기록이 없는 예전 상담(NOT_REQUESTED)에는 그리지 않는다
 */
export default function EndSummaryCard({ sessionId }: { sessionId: number }) {
  const { data, isPending, isError, isFetching, refetch, gaveUp } = useEndSummary(sessionId, true)

  // 조회 실패는 요약 실패나 빈 상담으로 단정하지 않는다
  if (isError && !data) {
    return (
      <Shell>
        <p className="m-0 text-sm leading-[22px] text-ink-sub">요약을 불러오지 못했어요. 대화 기록은 위에서 그대로 볼 수 있어요.</p>
        <button type="button" disabled={isFetching} onClick={() => void refetch()} className={retryClass}>
          <RotateCw size={14} strokeWidth={2} aria-hidden />
          다시 불러오기
        </button>
      </Shell>
    )
  }

  if (isPending || !data) return <Preparing />

  switch (data.summaryStatus) {
    case 'NOT_REQUESTED':
      return null
    case 'PENDING':
    case 'GENERATING':
      return gaveUp ? (
        <Shell sub="상담 종료">
          <p className="m-0 text-sm leading-[22px] text-ink-sub">
            요약이 아직 준비되지 않았어요. 잠시 후 다시 확인해 주세요.
          </p>
          <button type="button" disabled={isFetching} onClick={() => void refetch()} className={retryClass}>
            <RotateCw size={14} strokeWidth={2} aria-hidden />
            {isFetching ? '확인하는 중…' : '다시 확인'}
          </button>
        </Shell>
      ) : (
        <Preparing />
      )
    case 'COMPLETED':
      return data.summary ? (
        <Shell sub={generatedLabel(data.generatedAt) ?? '상담 종료'}>
          <Completed summary={data.summary} />
        </Shell>
      ) : null
    case 'EMPTY':
      return (
        <Shell sub="상담 종료">
          <p className="m-0 text-sm leading-[22px] text-ink-sub">요약할 상담 내용이 없어요.</p>
        </Shell>
      )
    case 'FAILED':
      return (
        <Shell sub="상담 종료">
          <p className="m-0 text-sm leading-[22px] text-ink-sub">
            상담 요약을 만들지 못했어요. 위 대화 기록에서 안내받은 내용을 확인해 주세요.
          </p>
        </Shell>
      )
    default:
      return null
  }
}

function Preparing() {
  return (
    <Shell sub="상담 종료" busy>
      <p role="status" className="m-0 flex items-center gap-2 text-sm leading-[22px] text-ink-sub">
        무러바라가 상담 내용을 정리하고 있어요
        <span aria-hidden className="inline-flex gap-1">
          {[0, 0.15, 0.3].map((delay) => (
            <span key={delay} className="tm-dot h-1.5 w-1.5 rounded-full bg-brand" style={{ animationDelay: `${delay}s` }} />
          ))}
        </span>
      </p>
      <div aria-hidden className="mt-3 flex flex-col gap-2">
        {['w-1/3', 'w-full', 'w-4/5'].map((w) => (
          <span key={w} className={`tm-pulse h-3 rounded-full bg-surface-2 ${w}`} />
        ))}
      </div>
    </Shell>
  )
}
