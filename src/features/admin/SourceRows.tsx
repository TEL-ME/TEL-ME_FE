import { Link } from 'react-router-dom'
import type { AdminSource } from '../../api/admin'

/** 답변 근거로 쓴 FAQ (그때의 제목 스냅샷). FAQ가 남아 있으면 수정으로 바로 간다 */
export default function SourceRows({ sources }: { sources: AdminSource[] }) {
  if (sources.length === 0) return <p className="text-sm text-ink-muted">근거로 쓴 FAQ가 없어요</p>
  return (
    <ol className="flex flex-col gap-1.5">
      {[...sources]
        .sort((a, b) => a.searchRank - b.searchRank)
        .map((s, i) => (
          <li key={`${s.faqId}-${i}`} className="flex items-center gap-2 rounded-[10px] bg-surface-2 px-3 py-2 text-sm">
            <b className="min-w-3 text-xs text-brand-text">{i + 1}</b>
            <span className="min-w-0 flex-1">{s.titleSnapshot}</span>
            {s.faqId != null && (
              <Link to={`/admin/faqs/${s.faqId}`} className="shrink-0 text-[13px] font-bold text-brand-strong underline underline-offset-2">
                수정
              </Link>
            )}
          </li>
        ))}
    </ol>
  )
}
