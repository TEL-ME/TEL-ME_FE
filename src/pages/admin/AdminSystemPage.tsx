import { useIsFetching, useQueryClient } from '@tanstack/react-query'
import { Activity, Gauge, ListTree, OctagonAlert, RotateCw, type LucideIcon } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { PageHeader, secondaryBtn } from '../../features/admin/components/AdminUi'
import IntentPanel from '../../features/admin/system/IntentPanel'
import LatencyPanel from '../../features/admin/system/LatencyPanel'
import LlmErrorsPanel from '../../features/admin/system/LlmErrorsPanel'
import SearchScoresPanel from '../../features/admin/system/SearchScoresPanel'

const TABS: { key: string; label: string; icon: LucideIcon; desc: string; api: string; ready?: boolean }[] = [
  { key: 'errors', label: '오류 목록', icon: OctagonAlert, desc: '답변을 만들다 실패한 작업과 오류 종류, 시도 횟수를 보여드려요.', api: 'GET /api/v1/admin/system/errors', ready: true },
  { key: 'latency', label: '응답 속도', icon: Gauge, desc: '첫 글자까지·답변이 끝날 때까지 걸린 시간을 작업별로 보여드려요.', api: 'GET /api/v1/admin/system/latency', ready: true },
  { key: 'scores', label: '검색 점수', icon: Activity, desc: 'FAQ 검색 점수 분포와 임계값을 넘은 비율을 보여드려요.', api: 'GET /api/v1/admin/system/search-scores', ready: true },
  { key: 'intents', label: '의도 분포', icon: ListTree, desc: '질문 의도(FAQ·매장·복합·미분류) 비율과 규칙·LLM 분류 비율을 보여드려요.', api: 'GET /api/v1/admin/dashboard/intent-distribution', ready: true },
]

/** 운영 상태 (시안 AdminSystem*). 오류 목록·응답 속도·의도 분포는 연결됨, 검색 점수는 API가 생기기 전까지 "구현 예정" */
export default function AdminSystemPage() {
  const [params, setParams] = useSearchParams()
  const tab = TABS.find((t) => t.key === params.get('tab')) ?? TABS[0]
  const Icon = tab.icon

  // 새로고침: 운영 상태의 모든 탭 데이터(['admin', 'system', ...])를 다시 받는다
  const queryClient = useQueryClient()
  const refreshing = useIsFetching({ queryKey: ['admin', 'system'] }) > 0
  const refresh = () => void queryClient.invalidateQueries({ queryKey: ['admin', 'system'] })
  // 지금 탭 데이터를 마지막으로 받은 시각 (불러오기가 끝날 때마다 다시 계산된다)
  const lastAt = Math.max(
    0,
    ...queryClient
      .getQueryCache()
      .findAll({ queryKey: ['admin', 'system', tab.key] })
      .map((q) => q.state.dataUpdatedAt),
  )
  const updatedAt = lastAt ? new Date(lastAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : null

  return (
    <>
      <PageHeader
        title="운영 상태"
        desc="답변을 만드는 과정이 잘 돌아가는지 봐요."
        actions={
          tab.ready && (
            <div className="flex items-center gap-3">
              {updatedAt && <span className="text-[13px] text-ink-muted">{updatedAt} 기준</span>}
              <button type="button" onClick={refresh} disabled={refreshing} className={`${secondaryBtn} h-10 px-3.5 text-sm`}>
                <RotateCw size={16} aria-hidden className={refreshing ? 'animate-spin' : ''} />
                {refreshing ? '불러오는 중…' : '새로고침'}
              </button>
            </div>
          )
        }
      />
      <div role="tablist" aria-label="운영 상태" className="flex gap-1 border-b border-line">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            type="button"
            aria-selected={tab.key === t.key}
            onClick={() => setParams({ tab: t.key })}
            className={`-mb-px h-11 border-b-2 px-3 text-[15px] ${
              tab.key === t.key ? 'border-brand font-bold text-ink' : 'border-transparent font-medium text-ink-sub'
            }`}
          >
            {t.label}
            {!t.ready && <span className="ml-1 text-[11px] font-semibold text-ink-muted">준비 중</span>}
          </button>
        ))}
      </div>
      {tab.key === 'errors' && <LlmErrorsPanel />}
      {tab.key === 'latency' && <LatencyPanel />}
      {tab.key === 'scores' && <SearchScoresPanel />}
      {tab.key === 'intents' && <IntentPanel />}
      {!tab.ready && (
      <section
        role="tabpanel"
        className="flex flex-col items-center gap-3 rounded-card border-[1.5px] border-dashed border-line bg-surface px-6 py-16 text-center"
      >
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-2 text-ink-muted">
          <Icon size={26} strokeWidth={1.8} aria-hidden />
        </span>
        <h2 className="text-lg font-extrabold">
          {tab.label} <span className="ml-1 rounded-full bg-brand-soft px-2 py-0.5 align-middle text-xs font-bold text-brand-strong">구현 예정</span>
        </h2>
        <p className="text-sm text-ink-sub">{tab.desc}</p>
        <p className="text-xs text-ink-muted">
          백엔드 통계 API가 생기면 연결해요 · <code className="rounded bg-surface-2 px-1.5 py-0.5">{tab.api}</code> (가안)
        </p>
      </section>
      )}
    </>
  )
}
