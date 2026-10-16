import { Pause, Play, ShieldAlert } from 'lucide-react'
import { useState } from 'react'
import { ApiError } from '../../api/client'
import type { MonitoringListItem, MonitoringStatus } from '../../api/adminMonitoring'
import { Badge, Card, Chip, Empty, PageHeader, secondaryBtn } from '../../features/admin/components/AdminUi'
import ExecutionPanel from '../../features/admin/monitoring/ExecutionPanel'
import { useMonitoringList } from '../../features/admin/monitoring/queries'
import StageCell from '../../features/admin/monitoring/StageCell'
import {
  STAGE_COLUMNS,
  STATE_STYLE,
  STATUS_BADGE,
  STATUS_FILTERS,
  formatElapsed,
  isTodayKst,
  kstDay,
  kstTime,
  whoLabel,
} from '../../features/admin/monitoring/stages'

/** 시각 · 질문 · 단계 7칸 · 소요 · 상태. 상세를 열면 단계 칸을 점으로 줄인다 */
const COLS = '76px minmax(180px,1.6fr) repeat(7, minmax(64px,1fr)) 64px 64px'
const COMPACT_COLS = '64px minmax(140px,1fr) repeat(7, 28px) 56px 56px'

/**
 * AI 처리 흐름 (TELME-169): 질문 하나가 입력 검사 → 라우팅 → 검색 → 판정 → 생성 → 출력 검사를 어떻게 지났는지.
 * 목록은 3초마다 최신 페이지를 다시 받아 통째로 바꾸고, 행을 누르면 오른쪽에 상세를 연다 (차단 행은 상세 없음)
 */
export default function AdminMonitoringPage() {
  const [status, setStatus] = useState<MonitoringStatus | null>(null)
  const [live, setLive] = useState(true)
  const [openId, setOpenId] = useState<number | null>(null)
  const { latest, items, hasMore, loadMore, loadingMore, moreError } = useMonitoringList(status, live)
  const updatedAt = latest.dataUpdatedAt ? kstTime(new Date(latest.dataUpdatedAt).toISOString()) : null
  const compact = openId != null
  const cols = compact ? COMPACT_COLS : COLS

  return (
    <>
      <PageHeader
        title="AI 처리 흐름"
        desc="질문 하나가 AI 단계를 어떻게 지나갔는지 실시간으로 봐요."
        actions={
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-[13px] text-ink-muted">
              <span aria-hidden className={`h-2 w-2 rounded-full ${live ? 'animate-pulse bg-[#2f9e6f]' : 'bg-ink-muted'}`} />
              {live ? '실시간 · 3초마다' : '멈춤'}
              {updatedAt && <span>· {updatedAt} 기준</span>}
            </span>
            <button type="button" onClick={() => setLive((v) => !v)} className={`${secondaryBtn} h-10 px-3.5 text-sm`}>
              {live ? <Pause size={16} aria-hidden /> : <Play size={16} aria-hidden />}
              {live ? '멈추기' : '다시 켜기'}
            </button>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[13px] font-bold text-ink-sub">상태</span>
          {STATUS_FILTERS.map(([v, label]) => (
            <Chip
              key={v ?? 'ALL'}
              on={status === v}
              onClick={() => {
                setStatus(v)
                setOpenId(null)
              }}
            >
              {label}
            </Chip>
          ))}
        </div>
        <Legend />
      </div>

      <p className="flex items-center gap-1.5 text-xs text-ink-muted">
        <ShieldAlert size={14} aria-hidden />
        질문·답변 원문에 이름·주소 같은 개인정보가 있을 수 있어요(번호만 가려져 있음). 화면 캡처·공유에 주의해 주세요.
      </p>

      <div className="flex items-start gap-4">
        <Card className="min-w-0 flex-1">
          <div className="overflow-x-auto">
            <div className={compact ? '' : 'min-w-[980px]'}>
              <div
                className="grid h-[42px] items-center gap-x-2 bg-surface-2 px-4 text-xs font-bold text-ink-muted"
                style={{ gridTemplateColumns: cols }}
              >
                <span>시각 (KST)</span>
                <span>질문</span>
                {STAGE_COLUMNS.map((c) => (
                  <span key={c.key} title={c.label} className={compact ? 'text-center' : 'truncate'}>
                    {compact ? c.label.slice(0, 1) : c.label}
                  </span>
                ))}
                <span className="text-right">소요</span>
                <span className="text-right">상태</span>
              </div>

              {latest.isPending ? (
                <Empty>불러오는 중…</Empty>
              ) : latest.isError && items.length === 0 ? (
                <Empty>
                  {latest.error instanceof ApiError ? latest.error.message : '처리 흐름을 불러오지 못했어요.'}{' '}
                  <button type="button" onClick={() => void latest.refetch()} className="font-semibold underline underline-offset-2">
                    다시 시도
                  </button>
                </Empty>
              ) : items.length === 0 ? (
                <Empty>{status ? '이 상태의 질문이 없어요.' : '아직 처리한 질문이 없어요.'}</Empty>
              ) : (
                <ul className="m-0 list-none divide-y divide-line p-0">
                  {items.map((row) => (
                    <Row
                      key={row.messageId}
                      row={row}
                      cols={cols}
                      compact={compact}
                      open={openId != null && row.executionId === openId}
                      onOpen={setOpenId}
                    />
                  ))}
                </ul>
              )}
            </div>
          </div>
          {(hasMore || moreError != null) && items.length > 0 && (
            <div className="flex items-center justify-center gap-3 border-t border-line px-4 py-3">
              {moreError != null && <span className="text-[13px] text-danger">이전 기록을 불러오지 못했어요.</span>}
              <button type="button" disabled={loadingMore} onClick={() => void loadMore()} className={`${secondaryBtn} h-9 px-4 text-[13px]`}>
                {loadingMore ? '불러오는 중…' : '이전 기록 더 보기'}
              </button>
            </div>
          )}
        </Card>

        {openId != null && <ExecutionPanel key={openId} executionId={openId} onClose={() => setOpenId(null)} />}
      </div>
    </>
  )
}

function Row({
  row,
  cols,
  compact,
  open,
  onOpen,
}: {
  row: MonitoringListItem
  cols: string
  compact: boolean
  open: boolean
  onOpen: (id: number | null) => void
}) {
  const canOpen = row.executionId != null
  const badge = STATUS_BADGE[row.status] ?? { label: row.status, tone: 'muted' as const }
  return (
    <li>
      <button
        type="button"
        disabled={!canOpen}
        aria-pressed={open}
        onClick={() => canOpen && onOpen(open ? null : row.executionId)}
        title={canOpen ? (row.lastStage ? `마지막 단계: ${row.lastStage}` : undefined) : '차단된 질문은 상세 기록이 없어요'}
        className={`grid min-h-[56px] w-full items-center gap-x-2 px-4 py-2 text-left text-ink disabled:cursor-default ${
          open ? 'bg-brand-soft' : canOpen ? 'hover:bg-surface-2' : ''
        }`}
        style={{ gridTemplateColumns: cols }}
      >
        <span className="flex flex-col text-xs leading-4 tabular-nums">
          <span className="font-semibold">{kstTime(row.startedAt)}</span>
          {!isTodayKst(row.startedAt) && <span className="text-ink-muted">{kstDay(row.startedAt)}</span>}
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-[13px] font-semibold" title={row.questionPreview ?? undefined}>
            {row.questionPreview ?? '(내용 없음)'}
          </span>
          <span className="truncate text-[11px] text-ink-muted">
            {whoLabel(row)}
            {row.errorCode && <span className="ml-1.5 font-mono text-danger">{row.errorCode}</span>}
          </span>
        </span>
        {STAGE_COLUMNS.map((c) => (
          <StageCell key={c.key} cell={row.stages?.[c.key]} title={c.label} compact={compact} />
        ))}
        <span className={`text-right text-xs tabular-nums ${row.status === 'RUNNING' ? 'font-bold text-[#2457a3] dark:text-[#96bff0]' : 'text-ink-sub'}`}>
          {formatElapsed(row.elapsedMs)}
        </span>
        <span className="flex justify-end">
          <Badge tone={badge.tone}>{badge.label}</Badge>
        </span>
      </button>
    </li>
  )
}

function Legend() {
  return (
    <div className="ml-auto flex items-center gap-3 text-xs text-ink-muted">
      {(['PASSED', 'PARTIAL', 'FAILED', 'RUNNING', 'SKIPPED'] as const).map((s) => (
        <span key={s} className="flex items-center gap-1">
          <span aria-hidden className={`h-2 w-2 rounded-full ${STATE_STYLE[s].dot}`} />
          {STATE_STYLE[s].name}
        </span>
      ))}
    </div>
  )
}
