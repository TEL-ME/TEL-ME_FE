import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { adminSystemApi, LLM_TASKS, taskLabel, type LlmErrorType, type LlmTaskType } from '../../../api/admin'
import { formatAdminTime } from '../../../lib/date'
import { Badge, Card, Chip, Empty, FilterSelect, Pager, TableHead } from '../components/AdminUi'
import { PERIODS, periodFrom, type Period } from '../periods'
import { formatMs } from './format'

const ERROR_TYPES: [LlmErrorType, string][] = [
  ['TIMEOUT', '시간 초과'],
  ['CONNECTION_FAILED', '연결 실패'],
  ['MODEL_ERROR', '모델 오류'],
]
const errorLabel = (t: string) => ERROR_TYPES.find(([k]) => k === t)?.[1] ?? t
const TASK_OPTIONS = [['ALL', '전체'], ...LLM_TASKS] as [LlmTaskType | 'ALL', string][]

const COLS = '120px 96px 92px 56px 76px minmax(0,1fr) 72px'

/** 운영 상태 › 오류 목록: LLM 호출이 실패한 기록 (재시도는 시도마다 한 건) */
export default function LlmErrorsPanel() {
  const [errorType, setErrorType] = useState<LlmErrorType | null>(null)
  const [taskType, setTaskType] = useState<LlmTaskType | 'ALL'>('ALL')
  const [period, setPeriod] = useState<Period>('7')
  const [page, setPage] = useState(0)

  const query = {
    errorType: errorType ?? undefined,
    taskType: taskType === 'ALL' ? undefined : taskType,
    from: periodFrom(period),
    page,
    size: 20,
  }
  const list = useQuery({
    queryKey: ['admin', 'system', 'errors', query],
    queryFn: () => adminSystemApi.errors(query),
    placeholderData: keepPreviousData,
  })

  const pick = (fn: () => void) => {
    fn()
    setPage(0)
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-[13px] font-bold text-ink-sub">오류</span>
        <Chip on={errorType === null} onClick={() => pick(() => setErrorType(null))}>
          전체
        </Chip>
        {ERROR_TYPES.map(([k, label]) => (
          <Chip key={k} on={errorType === k} onClick={() => pick(() => setErrorType(k))}>
            {label}
          </Chip>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <FilterSelect label="작업" value={taskType} options={TASK_OPTIONS} onChange={(v) => pick(() => setTaskType(v))} />
        <FilterSelect label="기간" value={period} options={PERIODS} onChange={(v) => pick(() => setPeriod(v))} />
        <span className="text-[13px] text-ink-muted">최신순 · 재시도한 호출은 시도마다 한 줄</span>
      </div>
      <Card>
        <TableHead cols={COLS}>
          <span>시각</span>
          <span>작업</span>
          <span>오류</span>
          <span>시도</span>
          <span>걸린 시간</span>
          <span>메시지</span>
          <span>실행</span>
        </TableHead>
        {list.isPending && <Empty>불러오는 중…</Empty>}
        {list.isError && <Empty>목록을 불러오지 못했어요.</Empty>}
        {list.data?.errors.length === 0 && <Empty>조건에 맞는 오류가 없어요.</Empty>}
        {list.data?.errors.map((e) => (
          <div
            key={e.generationId}
            className="grid min-h-12 items-center gap-x-4 border-t border-line px-5 py-2 text-sm"
            style={{ gridTemplateColumns: COLS }}
          >
            <span className="text-ink-sub">{formatAdminTime(e.createdAt)}</span>
            <span className="truncate font-semibold">{taskLabel(e.taskType)}</span>
            <span>
              <Badge tone={e.errorType === 'TIMEOUT' ? 'notice' : 'danger'}>{errorLabel(e.errorType)}</Badge>
            </span>
            <span className="text-ink-sub">{e.attempt}회차</span>
            <span className="text-ink-sub">{formatMs(e.totalMs)}</span>
            <span className="truncate text-ink-sub" title={e.errorMessage ?? undefined}>
              {e.errorMessage || '—'}
              {e.model && <span className="ml-1.5 text-xs text-ink-muted">({e.model})</span>}
            </span>
            <span className="text-xs text-ink-muted">{e.executionId ? `#${e.executionId}` : '—'}</span>
          </div>
        ))}
        {list.data && list.data.totalElements > 0 && (
          <Pager page={page} totalPages={list.data.totalPages} total={list.data.totalElements} unit="건" onPage={setPage} />
        )}
      </Card>
    </>
  )
}
