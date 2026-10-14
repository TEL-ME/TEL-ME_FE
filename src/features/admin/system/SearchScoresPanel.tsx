import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { adminSystemApi, type SearchScores } from '../../../api/admin'
import { Card, Empty, FilterSelect } from '../components/AdminUi'
import { PERIODS, periodFrom, type Period } from '../periods'

const rate = (n: number, of: number) => (of ? `${((n / of) * 100).toFixed(1)}%` : '-')
const score = (v: number) => v.toFixed(2)
/**
 * 질문 벡터로만 통과한 질문 수 (근사).
 * 백엔드는 Q_A 점수만 남겨서, 근거를 찾은 질문 중 Q_A 임계값을 못 넘은 만큼을 질문 벡터 통과로 본다
 */
const questionOnly = (d: SearchScores) => Math.max(0, d.passed - d.aboveThreshold)

/**
 * 운영 상태 › 검색 점수 (TELME-123)
 * 상담에서 질문마다 처음 한 FAQ 검색의 질문+답변 벡터(Q_A) 1위 점수 분포와 임계값.
 * 임계값 근처에 막대가 몰려 있으면 임계값을 조금만 바꿔도 "근거 없음" 비율이 크게 달라진다.
 */
export default function SearchScoresPanel() {
  const [period, setPeriod] = useState<Period>('7')
  const from = periodFrom(period)
  const q = useQuery({
    queryKey: ['admin', 'system', 'scores', from ?? 'all'],
    queryFn: () => adminSystemApi.searchScores({ from }),
    placeholderData: keepPreviousData,
  })
  const d = q.data

  return (
    <>
      <div className="flex flex-wrap items-center gap-4">
        <FilterSelect label="기간" value={period} options={PERIODS} onChange={setPeriod} />
        {d && (
          <span className="text-[13px] text-ink-muted">
            질문 {d.total.toLocaleString()}건 · 기록은 90일 보관
          </span>
        )}
      </div>

      {q.isPending && <Empty>불러오는 중…</Empty>}
      {q.isError && <Empty>검색 점수를 불러오지 못했어요.</Empty>}
      {d && d.total === 0 && <Empty>이 기간에 FAQ 검색 기록이 없어요.</Empty>}

      {d && d.total > 0 && (
        <>
          <div className="grid grid-cols-4 gap-4">
            <Stat title="Q_A 임계값" value={score(d.threshold)} note="질문+답변 벡터 기준" />
            <Stat
              title="첫 검색으로 근거 찾음"
              value={rate(d.passed, d.total)}
              note={`${d.passed.toLocaleString()} / ${d.total.toLocaleString()}건`}
              detail={`Q_A 통과 ${Math.min(d.aboveThreshold, d.passed).toLocaleString()}건 · 질문 벡터로만 ${questionOnly(d).toLocaleString()}건`}
            />
            <Stat title="정제 질문으로 찾음" value={rate(d.refinedPassed, d.total)} note={`첫 검색은 비었던 ${d.refinedPassed.toLocaleString()}건`} />
            <Stat
              title="근거 못 찾음"
              value={rate(d.total - d.passed - d.refinedPassed, d.total)}
              note={`${Math.max(0, d.total - d.passed - d.refinedPassed).toLocaleString()}건`}
            />
          </div>
          <Histogram d={d} />
        </>
      )}
    </>
  )
}

function Stat({ title, value, note, detail }: { title: string; value: string; note: string; detail?: string }) {
  return (
    <Card className="flex flex-col gap-1 px-5 py-4">
      <h2 className="text-[13px] font-bold text-ink-sub">{title}</h2>
      <p className="text-2xl font-extrabold tracking-[-0.5px]">{value}</p>
      <p className="text-xs text-ink-muted">{note}</p>
      {detail && <p className="text-xs font-semibold text-ink-sub">{detail}</p>}
    </Card>
  )
}

/** 0~1을 0.05 간격 20칸. 임계값 이상 칸은 브랜드색, 미만은 회색. 임계값 자리에 세로선 */
function Histogram({ d }: { d: SearchScores }) {
  const max = Math.max(1, ...d.buckets.map((b) => b.count))
  const line = Math.min(100, Math.max(0, d.threshold * 100))

  return (
    <Card className="flex flex-col gap-4 px-5 py-4">
      <div>
        <h2 className="text-[17px] font-extrabold">Q_A 1위 점수 분포</h2>
        <p className="text-[13px] text-ink-muted">
          {d.scored.toLocaleString()}건 중 Q_A 임계값 이상 {d.aboveThreshold.toLocaleString()}건(
          {rate(d.aboveThreshold, d.scored)}) · 임계값 아래도 질문 벡터로 통과했을 수 있어요
        </p>
      </div>
      <div className="relative">
        <div className="flex h-48 items-end gap-1 border-b border-line">
          {d.buckets.map((b) => {
            const above = b.min >= d.threshold
            return (
              <div
                key={b.min}
                className="group relative flex h-full flex-1 flex-col justify-end"
                title={`${score(b.min)} ~ ${score(b.max)}: ${b.count.toLocaleString()}건`}
              >
                {b.count > 0 && (
                  <span className="mb-1 text-center text-[10px] font-semibold text-ink-sub opacity-0 group-hover:opacity-100">
                    {b.count.toLocaleString()}
                  </span>
                )}
                <span
                  className={`block rounded-t-[3px] ${above ? 'bg-brand' : 'bg-ink-muted opacity-40'}`}
                  style={{ height: `${(b.count / max) * 100}%`, minHeight: b.count ? 2 : 0 }}
                />
              </div>
            )
          })}
        </div>
        {/* 임계값 선 */}
        <div aria-hidden className="pointer-events-none absolute inset-y-0" style={{ left: `${line}%` }}>
          <span className="absolute inset-y-0 border-l-2 border-dashed border-brand-strong" />
          <span className="absolute -top-1 left-1.5 whitespace-nowrap rounded bg-brand-soft px-1.5 py-0.5 text-[11px] font-bold text-brand-strong">
            Q_A 임계값 {score(d.threshold)}
          </span>
        </div>
      </div>
      <div className="flex justify-between text-[11px] text-ink-muted">
        <span>0</span>
        <span>0.25</span>
        <span>0.5</span>
        <span>0.75</span>
        <span>1</span>
      </div>
    </Card>
  )
}
