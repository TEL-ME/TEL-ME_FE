import { useIsFetching, useQuery, useQueryClient } from '@tanstack/react-query'
import { RotateCw } from 'lucide-react'
import { Link } from 'react-router-dom'
import { adminDashboardApi, adminFeedbackApi, adminUnansweredApi, mainQuestion, type DashboardDay } from '../../api/admin'
import { Badge, Card, Empty, PageHeader, secondaryBtn } from '../../features/admin/components/AdminUi'
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
 * 대시보드 (시안 AdminDashboard). 들어오자마자 스크롤 없이 한눈에 보이게 한다.
 * - 숫자 카드: 요약 API 한 번. 답 못 한 질문·실패한 답변은 최근 7일, 미처리 오류 신고는 전체 기간, 오늘 질문 수는 어제와 비교
 * - 미리보기 목록: 기간 조건 없이 최신 5개
 * - 운영 상태 요약: 최근 7일 날짜별 질문·오류 수 막대그래프
 */
export default function AdminDashboardPage() {
  const week = daysAgoIso(7)
  // 목록은 최신 5개 (최근 7일에 없어도 비어 보이지 않게)
  const unanswered = useQuery({
    queryKey: ['admin', 'dash', 'unanswered'],
    queryFn: () => adminUnansweredApi.list({ size: 5 }),
  })
  const feedback = useQuery({
    queryKey: ['admin', 'dash', 'feedback'],
    queryFn: () => adminFeedbackApi.list({ handled: 'UNHANDLED', size: 5 }),
  })
  // 카드 숫자 (답 못 한 질문·실패한 답변은 최근 7일)
  const summary = useQuery({
    queryKey: ['admin', 'dash', 'summary', week],
    queryFn: () => adminDashboardApi.summary({ from: week }),
  })
  const daily = useQuery({ queryKey: ['admin', 'dash', 'daily'], queryFn: adminDashboardApi.daily })

  const s = summary.data
  const stats = [
    { label: '답 못 한 질문', value: s?.unansweredCount, note: 'FAQ 추가가 필요한 질문이에요 · 최근 7일', to: '/admin/quality?tab=unanswered' },
    { label: '미처리 오류 신고', value: s?.unhandledFeedbackCount, note: '아직 처리하지 않은 신고예요 · 전체 기간', to: '/admin/quality' },
    { label: '실패한 답변', value: s?.failedAnswerCount, note: '생성 실패·시간 초과 · 최근 7일', to: '/admin/quality?tab=unanswered&types=FAILED,TIMEOUT' },
  ]
  const diff = s ? s.todayQuestionCount - s.yesterdayQuestionCount : null

  // 새로고침: 대시보드에 있는 숫자·목록·그래프를 한 번에 다시 받는다
  const queryClient = useQueryClient()
  const refreshing = useIsFetching({ queryKey: ['admin', 'dash'] }) > 0
  const refresh = () => void queryClient.invalidateQueries({ queryKey: ['admin', 'dash'] })
  const updatedAt = summary.dataUpdatedAt
    ? new Date(summary.dataUpdatedAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <>
      <PageHeader
        title="대시보드"
        desc="오늘 확인할 것부터 보여드려요."
        actions={
          <div className="flex items-center gap-3">
            {updatedAt && <span className="text-[13px] text-ink-muted">{updatedAt} 기준</span>}
            <button type="button" onClick={refresh} disabled={refreshing} className={`${secondaryBtn} h-10 px-3.5 text-sm`}>
              <RotateCw size={16} aria-hidden className={refreshing ? 'animate-spin' : ''} />
              {refreshing ? '불러오는 중…' : '새로고침'}
            </button>
          </div>
        }
      />
      <div className="grid grid-cols-4 gap-3">
        {stats.map((s) => (
          <Link key={s.label} to={s.to} className="flex flex-col gap-1 rounded-card border-[1.5px] border-line bg-surface px-4 py-3.5 hover:border-brand">
            <span className="text-[13px] font-bold text-ink-sub">{s.label}</span>
            <span className="text-[26px] font-extrabold leading-8 tracking-[-0.6px]">
              {s.value ?? '–'}
              <span className="ml-1 text-base font-bold text-ink-sub">건</span>
            </span>
            <span className="text-xs text-ink-muted">{s.note}</span>
          </Link>
        ))}
        <div className="flex flex-col gap-1 rounded-card border-[1.5px] border-line bg-surface px-4 py-3.5">
          <span className="text-[13px] font-bold text-ink-sub">오늘 질문 수</span>
          <span className="text-[26px] font-extrabold leading-8 tracking-[-0.6px]">
            {s?.todayQuestionCount ?? '–'}
            <span className="ml-1 text-base font-bold text-ink-sub">건</span>
          </span>
          <span className="text-xs text-ink-muted">
            {diff == null ? '어제와 비교해요' : diff === 0 ? '어제와 같아요' : `어제보다 ${Math.abs(diff)}건 ${diff > 0 ? '많아요' : '적어요'}`}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <div className="flex items-center justify-between px-5 py-3">
            <h2 className="text-[17px] font-extrabold">최근 오류 신고</h2>
            <Link to="/admin/quality" className="text-[13px] font-bold text-brand-strong underline underline-offset-2">전체 보기</Link>
          </div>
          {feedback.data?.feedbacks.length === 0 && <Empty>처리할 신고가 없어요.</Empty>}
          <ul>
            {feedback.data?.feedbacks.map((f) => (
              <li key={f.feedbackId} className="flex flex-col gap-0.5 border-t border-line px-5 py-2.5 text-sm">
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
          <div className="flex items-center justify-between px-5 py-3">
            <h2 className="text-[17px] font-extrabold">답 못 한 질문</h2>
            <Link to="/admin/quality?tab=unanswered" className="text-[13px] font-bold text-brand-strong underline underline-offset-2">전체 보기</Link>
          </div>
          {unanswered.data?.messages.length === 0 && <Empty>답 못 한 질문이 없어요.</Empty>}
          <ul>
            {unanswered.data?.messages.map((m) => {
              const [label, tone] = TYPE[m.type] ?? [m.type, 'muted']
              return (
                <li key={m.messageId} className="flex items-center gap-3 border-t border-line px-5 py-2.5 text-sm">
                  <Badge tone={tone as 'brand'}>{label}</Badge>
                  <span className="min-w-0 flex-1 truncate" title={m.originQuestionPreview ? `되묻기에 답함: ${m.questionPreview}` : undefined}>
                    {mainQuestion(m)}
                  </span>
                  <Link
                    to={`/admin/faqs/new?question=${encodeURIComponent(mainQuestion(m))}`}
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

      {/* 운영 상태 요약: 자세한 건 운영 상태 메뉴에서 본다 */}
      <Card>
        <div className="flex items-center justify-between px-5 py-3">
          <h2 className="flex items-center gap-2 text-[17px] font-extrabold">
            운영 상태
          </h2>
          <Link to="/admin/system" className="text-[13px] font-bold text-brand-strong underline underline-offset-2">자세히 보기</Link>
        </div>
        <div className="grid grid-cols-2 gap-4 border-t border-line px-5 py-4">
          <DailyBars title="하루 질문 수 · 최근 7일" days={daily.data?.days} pick={(d) => d.questionCount} barClass="bg-brand" failed={daily.isError} />
          <DailyBars title="오류 · 최근 7일" days={daily.data?.days} pick={(d) => d.errorCount} barClass="bg-danger" failed={daily.isError} />
        </div>
      </Card>
    </>
  )
}

/** 최근 7일 막대그래프. 막대 위에 숫자, 아래에 날짜. 오늘은 진하게 */
function DailyBars({
  title,
  days,
  pick,
  barClass,
  failed,
}: {
  title: string
  days: DashboardDay[] | undefined
  pick: (d: DashboardDay) => number
  barClass: string
  failed: boolean
}) {
  const max = Math.max(1, ...(days ?? []).map(pick))
  const total = (days ?? []).reduce((n, d) => n + pick(d), 0)
  return (
    <div className="flex flex-col gap-2">
      <span className="flex items-baseline justify-between text-[13px] font-bold text-ink-sub">
        {title}
        {days && <span className="text-xs font-semibold text-ink-muted">합계 {total.toLocaleString()}건</span>}
      </span>
      {!days ? (
        <div className="flex h-[132px] items-center justify-center rounded-xl border-[1.5px] border-dashed border-line text-xs text-ink-muted">
          {failed ? '불러오지 못했어요' : '불러오는 중…'}
        </div>
      ) : (
        <div role="img" aria-label={`${title}: ${days.map((d) => `${d.date.slice(5)} ${pick(d)}건`).join(', ')}`} className="flex h-[132px] items-end gap-2">
          {days.map((d, i) => {
            const v = pick(d)
            const today = i === days.length - 1
            return (
              <div key={d.date} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                <span className={`text-[11px] font-bold ${today ? 'text-ink' : 'text-ink-muted'}`}>{v}</span>
                <span
                  className={`w-full max-w-[36px] rounded-t-md ${v ? barClass : 'bg-surface-2'} ${today ? '' : 'opacity-55'}`}
                  style={{ height: `${Math.max(4, (v / max) * 84)}px` }}
                />
                <span className={`text-[11px] ${today ? 'font-bold text-ink' : 'text-ink-muted'}`}>
                  {today ? '오늘' : `${Number(d.date.slice(5, 7))}/${Number(d.date.slice(8, 10))}`}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
