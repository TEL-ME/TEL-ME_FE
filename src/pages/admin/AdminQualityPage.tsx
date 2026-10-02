import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { adminFeedbackApi, adminUnansweredApi } from '../../api/admin'
import { daysAgoIso } from '../../lib/date'
import { PageHeader } from '../../features/admin/components/AdminUi'
import FeedbackPanel from '../../features/admin/FeedbackPanel'
import UnansweredPanel from '../../features/admin/UnansweredPanel'

/** 답변 품질: 오류 신고(싫어요) · 답 못 한 질문 (시안 AdminFeedback / AdminUnanswered) */
export default function AdminQualityPage() {
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') === 'unanswered' ? 'unanswered' : 'feedback'

  // 탭 옆 숫자: 미처리 신고 수(전체 기간) · 최근 7일 답 못 한 질문 수 — 각 탭의 기본 목록 건수와 같다
  const week = daysAgoIso(7)
  const feedbackCount = useQuery({
    queryKey: ['admin', 'feedbacks', 'count'],
    queryFn: () => adminFeedbackApi.list({ handled: 'UNHANDLED', size: 1 }),
  })
  const unansweredCount = useQuery({
    queryKey: ['admin', 'unanswered', 'count', week],
    queryFn: () => adminUnansweredApi.list({ from: week, size: 1 }),
  })

  const tabs = [
    { key: 'feedback', label: '오류 신고', count: feedbackCount.data?.totalElements },
    { key: 'unanswered', label: '답 못 한 질문', count: unansweredCount.data?.totalElements },
  ] as const

  return (
    <>
      <PageHeader title="답변 품질" desc="사용자가 ‘아쉬워요’로 신고한 답변과, 답하지 못한 질문을 모아 봐요." />
      <div role="tablist" aria-label="답변 품질" className="flex gap-1 border-b border-line">
        {tabs.map((t) => (
          <button
            key={t.key}
            role="tab"
            type="button"
            aria-selected={tab === t.key}
            onClick={() => setParams({ tab: t.key })}
            className={`-mb-px flex h-11 items-center gap-1.5 border-b-2 px-3 text-[15px] ${
              tab === t.key ? 'border-brand font-bold text-ink' : 'border-transparent font-medium text-ink-sub'
            }`}
          >
            {t.label}
            {t.count != null && (
              <span className="rounded-full bg-brand-soft px-2 text-xs font-bold text-brand-strong">{t.count}</span>
            )}
          </button>
        ))}
      </div>
      {tab === 'feedback' ? <FeedbackPanel /> : <UnansweredPanel />}
    </>
  )
}
