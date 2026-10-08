import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { adminDashboardApi, type ClassificationMethod, type IntentType } from '../../../api/admin'
import { formatAdminTime } from '../../../lib/date'
import { Card, Empty, FilterSelect } from '../components/AdminUi'
import { PERIODS, periodFrom, type Period } from '../periods'

const INTENT: Record<IntentType, { label: string; desc: string; bar: string }> = {
  FAQ: { label: 'FAQ 문의', desc: '요금제·유심·로밍 등 상담 질문', bar: 'bg-brand' },
  STORE: { label: '매장 찾기', desc: '가까운 매장·업무 가능 매장', bar: 'bg-chip-roam' },
  BOTH: { label: '복합', desc: 'FAQ와 매장 찾기를 함께 묻는 질문', bar: 'bg-chip-plan' },
  UNKNOWN: { label: '미분류', desc: '어느 쪽인지 정하지 못한 질문', bar: 'bg-ink-muted' },
}
const METHOD: Record<ClassificationMethod, { label: string; desc: string; bar: string }> = {
  RULE: { label: '규칙', desc: '키워드 규칙 (모델 장애 대체·보정 포함)', bar: 'bg-chip-plan' },
  LLM: { label: 'LLM', desc: '모델이 분류', bar: 'bg-brand' },
  UNRECORDED: { label: '기록 없음', desc: '분류 방법이 남지 않은 기록', bar: 'bg-ink-muted' },
}

const pct = (v: number) => `${Number(v).toFixed(v % 1 === 0 ? 0 : 1)}%`

/** 운영 상태 › 의도 분포: 질문이 어떤 의도로 분류됐는지, 규칙·LLM 중 무엇으로 분류됐는지 */
export default function IntentPanel() {
  const [period, setPeriod] = useState<Period>('7')
  const from = periodFrom(period)
  const dist = useQuery({
    queryKey: ['admin', 'system', 'intents', from ?? 'all'],
    queryFn: () => adminDashboardApi.intentDistribution({ from }),
    placeholderData: keepPreviousData,
  })
  const d = dist.data

  return (
    <>
      <div className="flex flex-wrap items-center gap-4">
        <FilterSelect label="기간" value={period} options={PERIODS} onChange={setPeriod} />
        {d && (
          <span className="text-[13px] text-ink-muted">
            분류 기록 {d.totalCount.toLocaleString()}건 · {d.from ? `${formatAdminTime(d.from)}부터` : '전체 기간'}
          </span>
        )}
      </div>

      {dist.isPending && <Empty>불러오는 중…</Empty>}
      {dist.isError && <Empty>의도 분포를 불러오지 못했어요.</Empty>}
      {d && d.totalCount === 0 && <Empty>이 기간에 분류된 질문이 없어요.</Empty>}

      {d && d.totalCount > 0 && (
        <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] items-start gap-4">
          <Share
            title="질문 의도"
            note="질문을 어디로 보냈는지"
            rows={d.intents.map((r) => ({ key: r.intent, ...INTENT[r.intent], count: r.count, percentage: r.percentage }))}
          />
          <Share
            title="분류 방법"
            note="규칙이 많으면 모델 호출이 줄어 빨라요"
            rows={d.methods.map((r) => ({ key: r.method, ...METHOD[r.method], count: r.count, percentage: r.percentage }))}
          />
        </div>
      )}
    </>
  )
}

interface ShareRow {
  key: string
  label: string
  desc: string
  bar: string
  count: number
  percentage: number
}

/** 백엔드가 순서를 고정해 주므로(0건 포함) 그 순서대로 그린다 — 기간을 바꿔도 색·위치가 그대로라 비교하기 쉽다 */
function Share({ title, note, rows }: { title: string; note: string; rows: ShareRow[] }) {
  const sorted = rows
  return (
    <Card className="flex flex-col gap-4 px-5 py-4">
      <div>
        <h2 className="text-[17px] font-extrabold">{title}</h2>
        <p className="text-[13px] text-ink-muted">{note}</p>
      </div>
      {/* 한 줄 비율 막대 */}
      <div aria-hidden className="flex h-3 overflow-hidden rounded-full bg-surface-2">
        {sorted.map((r) => (
          <span key={r.key} className={r.bar} style={{ width: `${r.percentage}%` }} />
        ))}
      </div>
      <ul className="flex flex-col gap-3">
        {sorted.map((r) => (
          <li key={r.key} className={`flex items-center gap-3 text-sm ${r.count ? '' : 'opacity-50'}`}>
            <span aria-hidden className={`h-2.5 w-2.5 shrink-0 rounded-[3px] ${r.bar}`} />
            <span className="min-w-0 flex-1">
              <span className="font-bold">{r.label}</span>
              <span className="ml-2 text-xs text-ink-muted">{r.desc}</span>
            </span>
            <span className="w-14 text-right font-extrabold">{pct(r.percentage)}</span>
            <span className="w-16 text-right text-ink-sub">{r.count.toLocaleString()}건</span>
          </li>
        ))}
      </ul>
    </Card>
  )
}
