import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { adminFeedbackApi, adminUnansweredApi } from '../../api/admin'
import { Badge, Card, Empty, PageHeader } from '../../features/admin/components/AdminUi'
import { daysAgoIso, formatAdminTime } from '../../lib/date'

const REASON: Record<string, string> = {
  WRONG_INFO: '정보가 정확하지 않아요',
  NOT_RELATED: '질문과 관련이 없어요',
  HARD_TO_READ: '이해하기 어려워요',
}
const TYPE: Record<string, [string, 'brand' | 'notice' | 'danger']> = {
  NO_EVIDENCE: ['근거 없음', 'brand'],
  OUT_OF_SCOPE: ['범위 밖', 'notice'],
  FAILED: ['실패', 'danger'],
  TIMEOUT: ['시간 초과', 'danger'],
}

/**
 * 대시보드 (시안 AdminDashboard). 있는 관리자 API의 건수로 채운다.
 * "오늘 질문 수"는 통계 API가 없어 자리만 둔다.
 */
export default function AdminDashboardPage() {
  const week = daysAgoIso(7)
  const unanswered = useQuery({
    queryKey: ['admin', 'dash', 'unanswered', week],
    queryFn: () => adminUnansweredApi.list({ from: week, size: 5 }),
  })
  const feedback = useQuery({
    queryKey: ['admin', 'dash', 'feedback'],
    queryFn: () => adminFeedbackApi.list({ handled: 'UNHANDLED', size: 5 }),
  })
  const failed = useQuery({
    queryKey: ['admin', 'dash', 'failed', week],
    queryFn: async () => {
      const [f, t] = await Promise.all([
        adminUnansweredApi.list({ type: 'FAILED', from: week, size: 1 }),
        adminUnansweredApi.list({ type: 'TIMEOUT', from: week, size: 1 }),
      ])
      return f.totalElements + t.totalElements
    },
  })

  const stats = [
    { label: '답 못 한 질문', value: unanswered.data?.totalElements, note: 'FAQ 추가가 필요한 질문이에요 · 최근 7일', to: '/admin/quality?tab=unanswered' },
    { label: '새 오류 신고', value: feedback.data?.totalElements, note: '아직 처리하지 않은 신고예요', to: '/admin/quality' },
    { label: '실패한 답변', value: failed.data, note: '생성 실패·시간 초과 · 최근 7일', to: '/admin/quality?tab=unanswered' },
  ]

  return (
    <>
      <PageHeader title="대시보드" desc="오늘 확인할 것부터 보여드려요." />
      <div className="grid grid-cols-4 gap-4">
        {stats.map((s) => (
          <Link key={s.label} to={s.to} className="flex flex-col gap-1.5 rounded-card border-[1.5px] border-line bg-surface p-5 hover:border-brand">
            <span className="text-sm font-bold text-ink-sub">{s.label}</span>
            <span className="text-[32px] font-extrabold leading-10 tracking-[-0.8px]">
              {s.value ?? '–'}
              <span className="ml-1 text-base font-bold text-ink-sub">건</span>
            </span>
            <span className="text-xs text-ink-muted">{s.note}</span>
          </Link>
        ))}
        <div className="flex flex-col gap-1.5 rounded-card border-[1.5px] border-dashed border-line bg-surface p-5">
          <span className="text-sm font-bold text-ink-sub">오늘 질문 수</span>
          <span className="text-[32px] font-extrabold leading-10 text-ink-muted">–</span>
          <span className="text-xs text-ink-muted">통계 API가 생기면 보여드려요</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5">
        <Card>
          <div className="flex items-center justify-between px-5 py-4">
            <h2 className="text-[17px] font-extrabold">최근 오류 신고</h2>
            <Link to="/admin/quality" className="text-[13px] font-bold text-brand-strong underline underline-offset-2">전체 보기</Link>
          </div>
          {feedback.data?.feedbacks.length === 0 && <Empty>처리할 신고가 없어요.</Empty>}
          <ul>
            {feedback.data?.feedbacks.map((f) => (
              <li key={f.feedbackId} className="flex flex-col gap-1 border-t border-line px-5 py-3 text-sm">
                <span className="flex items-center justify-between text-xs">
                  <span className="font-bold text-brand-strong">{REASON[f.reasonCode] ?? f.reasonCode}</span>
                  <span className="text-ink-muted">{formatAdminTime(f.createdAt)}</span>
                </span>
                <span className="truncate">{f.questionPreview}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <div className="flex items-center justify-between px-5 py-4">
            <h2 className="text-[17px] font-extrabold">답 못 한 질문</h2>
            <Link to="/admin/quality?tab=unanswered" className="text-[13px] font-bold text-brand-strong underline underline-offset-2">전체 보기</Link>
          </div>
          {unanswered.data?.messages.length === 0 && <Empty>최근 7일 동안 답 못 한 질문이 없어요.</Empty>}
          <ul>
            {unanswered.data?.messages.map((m) => {
              const [label, tone] = TYPE[m.type] ?? [m.type, 'muted']
              return (
                <li key={m.messageId} className="flex items-center gap-3 border-t border-line px-5 py-3 text-sm">
                  <Badge tone={tone as 'brand'}>{label}</Badge>
                  <span className="min-w-0 flex-1 truncate">{m.questionPreview}</span>
                  <Link
                    to={`/admin/faqs/new?question=${encodeURIComponent(m.questionPreview)}`}
                    className="shrink-0 rounded-[10px] border-[1.5px] border-line px-2.5 py-1 text-xs font-bold text-ink"
                  >
                    FAQ 추가
                  </Link>
                </li>
              )
            })}
          </ul>
        </Card>
      </div>
    </>
  )
}
