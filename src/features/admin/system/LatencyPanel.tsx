import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { adminSystemApi, HIDDEN_TASKS, taskLabel, type LatencyStats } from '../../../api/admin'
import { daysAgoIso, formatAdminTime } from '../../../lib/date'
import { Card, Empty, FilterSelect, TableHead } from '../components/AdminUi'
import { formatMs } from './format'

type Range = '24h' | '7' | '30'
const RANGES = [
  ['24h', '최근 24시간'],
  ['7', '최근 7일'],
  ['30', '최근 30일'],
] as const
// 24시간은 백엔드 기본값이라 기간을 보내지 않는다
const rangeFrom = (r: Range) => (r === '24h' ? undefined : daysAgoIso(Number(r)))

const COLS = 'minmax(0,1fr) 80px 90px 90px 90px minmax(0,1.2fr)'

/** 운영 상태 › 응답 속도: 전체·첫 글자까지·작업별 평균/중앙값/p95 */
export default function LatencyPanel() {
  const [range, setRange] = useState<Range>('24h')
  const from = rangeFrom(range)
  const latency = useQuery({
    queryKey: ['admin', 'system', 'latency', from ?? '24h'],
    queryFn: () => adminSystemApi.latency({ from }),
    placeholderData: keepPreviousData,
  })
  const d = latency.data
  const tasks = d ? d.tasks.filter((t) => !HIDDEN_TASKS.has(t.taskType)).sort((a, b) => (b.p95Ms ?? -1) - (a.p95Ms ?? -1)) : []
  const maxP95 = Math.max(1, ...tasks.map((t) => t.p95Ms ?? 0))

  return (
    <>
      <div className="flex flex-wrap items-center gap-4">
        <FilterSelect label="기간" value={range} options={RANGES} onChange={setRange} />
        {d && (
          <span className="text-[13px] text-ink-muted">
            {formatAdminTime(d.from)} ~ {formatAdminTime(d.to)}
          </span>
        )}
      </div>

      {latency.isPending && <Empty>불러오는 중…</Empty>}
      {latency.isError && <Empty>응답 속도를 불러오지 못했어요.</Empty>}

      {d && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <StatCard title="전체 응답" desc="질문을 받은 때부터 답변 저장까지 (완료된 답변만)" stats={d.overall} />
            <StatCard title="첫 글자까지" desc="답변 생성 모델이 첫 글자를 내기까지" stats={d.firstToken} />
          </div>

          <Card>
            <div className="px-5 py-3">
              <h2 className="text-[17px] font-extrabold">작업별 모델 호출 시간</h2>
              <p className="mt-0.5 text-[13px] text-ink-muted">성공한 호출만 · p95가 긴 순서</p>
            </div>
            <TableHead cols={COLS}>
              <span>작업</span>
              <span>건수</span>
              <span>평균</span>
              <span>중앙값</span>
              <span>p95</span>
              <span />
            </TableHead>
            {tasks.map((t) => (
              <div
                key={t.taskType}
                className={`grid min-h-12 items-center gap-x-4 border-t border-line px-5 py-2 text-sm ${t.count ? '' : 'text-ink-muted'}`}
                style={{ gridTemplateColumns: COLS }}
              >
                <span className="truncate font-semibold">{taskLabel(t.taskType)}</span>
                <span>{t.count.toLocaleString()}</span>
                <span>{formatMs(t.avgMs)}</span>
                <span>{formatMs(t.p50Ms)}</span>
                <span className="font-bold">{formatMs(t.p95Ms)}</span>
                <span aria-hidden className="h-2 overflow-hidden rounded-full bg-surface-2">
                  {t.p95Ms != null && (
                    <span className="block h-full rounded-full bg-brand" style={{ width: `${(t.p95Ms / maxP95) * 100}%` }} />
                  )}
                </span>
              </div>
            ))}
          </Card>
        </>
      )}
    </>
  )
}

function StatCard({ title, desc, stats }: { title: string; desc: string; stats: LatencyStats }) {
  return (
    <Card className="flex flex-col gap-3 px-5 py-4">
      <div>
        <h2 className="text-[15px] font-extrabold">{title}</h2>
        <p className="text-xs text-ink-muted">{desc}</p>
      </div>
      {stats.count === 0 ? (
        <p className="py-3 text-sm text-ink-muted">이 기간에 기록이 없어요.</p>
      ) : (
        <dl className="grid grid-cols-4 gap-2">
          {[
            ['p95', formatMs(stats.p95Ms)],
            ['중앙값', formatMs(stats.p50Ms)],
            ['평균', formatMs(stats.avgMs)],
            ['건수', stats.count.toLocaleString()],
          ].map(([k, v], i) => (
            <div key={k} className="flex flex-col gap-0.5">
              <dt className="text-xs font-bold text-ink-sub">{k}</dt>
              <dd className={i === 0 ? 'text-2xl font-extrabold tracking-[-0.5px]' : 'text-lg font-bold'}>{v}</dd>
            </div>
          ))}
        </dl>
      )}
    </Card>
  )
}
