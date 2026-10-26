import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { ChevronDown, Info } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { adminSystemApi, type SearchScoreGrayZone, type SearchScores } from '../../../api/admin'
import { Badge, Card, Empty, FilterSelect } from '../components/AdminUi'
import { PERIODS, periodFrom, type Period } from '../periods'
import { judgeOutcomeTotals, scoreZone, type ScoreZone } from './format'

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
 * 실제 답변은 판정 구간의 후보를 판정기로 한 번 더 확인하므로, 판정 결과가 쌓이면 판정 뒤 결과(TELME-29)만 보여 준다.
 * 판정 결과가 아직 없으면(배포 직후, 판정 꺼짐) 남은 숫자가 예전 임계값 기준뿐이라 그 숫자를 보여 준다
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
          {d.grayZone && d.grayZone.recorded > 0 ? (
            <JudgeOutcome g={d.grayZone} total={d.total} />
          ) : (
            <>
              {d.grayZone && <NoJudgeOutcome g={d.grayZone} />}
              <ThresholdStats d={d} />
            </>
          )}
          <Histogram d={d} />
        </>
      )}
    </>
  )
}

/**
 * 예전 임계값(Q_A·질문 벡터) 기준으로 센 숫자. 판정 결과가 없을 때만 보인다.
 * 판정이 켜져 있으면 판정 결과가 쌓이기 전이라는 안내를 붙이고, 꺼져 있거나 백엔드 배포 전이면 이 숫자가 실제 결과다
 */
function ThresholdStats({ d }: { d: SearchScores }) {
  return (
    <div className="flex flex-col gap-2">
      {d.grayZone?.enabled && (
        <SectionTitle title="검색 결과" note={`판정 결과가 쌓이기 전이라 예전 기준(Q_A ${score(d.threshold)})으로 센 숫자예요`} />
      )}
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
    </div>
  )
}

function SectionTitle({ title, note, badge }: { title: string; note: string; badge?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <h2 className="text-[15px] font-extrabold">{title}</h2>
      {badge}
      <span className="text-[13px] text-ink-muted">{note}</span>
    </div>
  )
}

const zoneOf = (g: SearchScoreGrayZone) =>
  `판정 구간(현재 설정) Q_A ${score(g.qaFloor)}~${score(g.qaPass)} · 질문 벡터 ${score(g.questionFloor)}~${score(g.questionPass)}`

/** 이 기간에 판정 결과가 남은 질문이 없을 때의 안내 */
function NoJudgeOutcome({ g }: { g: SearchScoreGrayZone }) {
  return (
    <Card className="flex flex-col gap-1 px-5 py-4">
      <SectionTitle title="판정 뒤 실제 결과" note={zoneOf(g)} badge={!g.enabled && <Badge tone="muted">판정 꺼짐</Badge>} />
      <p className="text-[13px] text-ink-sub">
        {g.enabled
          ? '이 기간에 판정 결과가 남은 질문이 없어요. 판정 결과는 이 기능을 배포한 뒤의 검색부터 쌓여요.'
          : '판정이 꺼져 있어 점수만으로 검색해요. 아래 숫자가 실제 결과예요.'}
      </p>
    </Card>
  )
}

/** 판정 뒤 실제 결과(지금 운영 규칙 기준). 판정 결과가 남은 질문(recorded)만 분모로 쓴다 */
function JudgeOutcome({ g, total }: { g: SearchScoreGrayZone; total: number }) {
  const { found, finalNotFound, judgeFailed } = judgeOutcomeTotals(g)
  const rows: { label: string; note: string; count: number; tone: 'pass' | 'miss' | 'fail' }[] = [
    { label: '바로 통과', note: '점수가 높아 판정 없이 근거로 씀', count: g.passedDirectly, tone: 'pass' },
    { label: '판정기가 통과', note: '판정 구간 후보를 판정기가 답할 수 있다고 봄', count: g.passedByJudge, tone: 'pass' },
    { label: '판정 실패 뒤 점수로 통과', note: '판정 응답이 없어 판정 전 임계값 이상만 남김', count: g.passedOnJudgeFailure, tone: 'fail' },
    { label: '판정기가 거절', note: '판정 구간 후보를 모두 근거가 아니라고 봄', count: g.rejectedByJudge, tone: 'miss' },
    { label: '판정 실패로 버림', note: '판정 응답이 없어 판정 전 임계값 미만을 버림', count: g.droppedOnJudgeFailure, tone: 'fail' },
    { label: '판정 구간 아래', note: '후보가 모두 판정 구간보다 낮음', count: g.belowFloor, tone: 'miss' },
  ]
  const max = Math.max(1, ...rows.map((r) => r.count))

  return (
    <Card className="flex flex-col gap-4 px-5 py-4">
      <div className="flex flex-col gap-1">
        <SectionTitle
          title="검색 결과"
          note={`판정 결과가 남은 질문 ${g.recorded.toLocaleString()} / 전체 ${total.toLocaleString()}건`}
          badge={!g.enabled && <Badge tone="muted">지금은 판정 꺼짐</Badge>}
        />
        <p className="text-xs text-ink-muted">{zoneOf(g)} · 지난 기록은 당시 설정으로 판정된 결과예요</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Stat
          title="첫 검색으로 근거 찾음"
          value={rate(found, g.recorded)}
          note={`${found.toLocaleString()} / ${g.recorded.toLocaleString()}건`}
          detail={`바로 통과 ${g.passedDirectly.toLocaleString()} · 판정기가 통과 ${g.passedByJudge.toLocaleString()} · 판정 실패 뒤 ${g.passedOnJudgeFailure.toLocaleString()}`}
        />
        <Stat
          title="정제 질문으로 찾음"
          value={rate(g.refinedFinalPassed, g.recorded)}
          note={`첫 검색은 비었던 ${g.refinedFinalPassed.toLocaleString()}건`}
        />
        <Stat
          title="근거 못 찾음"
          value={rate(finalNotFound, g.recorded)}
          note={`${finalNotFound.toLocaleString()}건 · 정제 질문까지 못 찾음`}
        />
        <Stat
          title="판정 실패"
          value={rate(judgeFailed, g.recorded)}
          note={`${judgeFailed.toLocaleString()}건 · 점수로 대신 정함`}
          detail={judgeFailed > 0 ? 'Bedrock 응답 오류·시간 초과 확인' : undefined}
          alert={judgeFailed > 0}
        />
      </div>

      <Fold title="판정 결과 자세히 보기" count={rows.length}>
        <ul className="flex flex-col gap-2">
          {rows.map((r) => (
            <li key={r.label} className="grid grid-cols-[minmax(0,13rem)_minmax(0,1fr)_5.5rem] items-center gap-3 text-[13px]">
              <div className="min-w-0">
                <p className="font-bold text-ink">{r.label}</p>
                <p className="truncate text-xs text-ink-muted" title={r.note}>
                  {r.note}
                </p>
              </div>
              <div className="h-2 rounded-full bg-surface-2">
                <span
                  className={`block h-full rounded-full ${
                    r.tone === 'pass' ? 'bg-brand' : r.tone === 'fail' ? 'bg-danger' : 'bg-ink-muted opacity-40'
                  }`}
                  style={{
                    width: `${(r.count / max) * 100}%`,
                    minWidth: r.count ? 4 : 0,
                  }}
                />
              </div>
              <p className="text-right tabular-nums text-ink-sub">
                <span className="font-bold text-ink">{r.count.toLocaleString()}</span> · {rate(r.count, g.recorded)}
              </p>
            </li>
          ))}
        </ul>
      </Fold>
    </Card>
  )
}

/** 접어 둔 상세 목록. AI 처리 흐름 화면(ExecutionPanel)의 접기와 같은 모양이다 */
function Fold({ title, count, children }: { title: string; count?: number; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <section className="border-t border-line pt-3">
      <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-1.5 text-left text-[13px] font-bold">
        {title}
        {count != null && <span className="font-semibold text-ink-muted">{count}</span>}
        <ChevronDown size={16} aria-hidden className={`ml-auto text-ink-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="mt-2.5">{children}</div>}
    </section>
  )
}

function Stat({ title, value, note, detail, alert }: { title: string; value: string; note: string; detail?: string; alert?: boolean }) {
  return (
    <Card className="flex flex-col gap-1 px-5 py-4">
      <h2 className="text-[13px] font-bold text-ink-sub">{title}</h2>
      <p className={`text-2xl font-extrabold tracking-[-0.5px] ${alert ? 'text-danger' : ''}`}>{value}</p>
      <p className="text-xs text-ink-muted">{note}</p>
      {detail && <p className={`text-xs font-semibold ${alert ? 'text-danger' : 'text-ink-sub'}`}>{detail}</p>}
    </Card>
  )
}

/** 지금 답변 규칙의 세 구간 색. 막대와 아래 띠가 같은 색을 쓴다 */
const ZONE: Record<ScoreZone, { bg: string; text: string }> = {
  drop: { bg: 'color-mix(in srgb, var(--text-muted) 45%, transparent)', text: 'text-ink' },
  judge: { bg: 'color-mix(in srgb, var(--brand) 40%, transparent)', text: 'text-brand-strong' },
  pass: { bg: 'var(--brand)', text: 'text-white' },
}

const ZONE_LABEL: Record<ScoreZone, string> = { drop: '버림', judge: '판정', pass: '바로 통과' }

/**
 * 0~1을 0.05 간격 20칸. 막대 높이는 그 점수대의 질문 수다.
 * 판정 구간이 있으면 설명도 판정 기준 규칙으로 쓰고, 막대마다 지금 답변 규칙(버림·판정·바로 통과) 중 한 색을 칠하고,
 * 막대 아래 띠에 정확한 경계를 그린다.
 * 백엔드는 칸별 개수만 줘서 경계(0.69)가 걸친 칸은 칸의 가운데 점수가 속한 구간 색으로 칠한다(scoreZone).
 * 판정 구간이 없으면(백엔드 배포 전) 예전처럼 임계값 이상은 브랜드색, 미만은 회색이고 임계값 선을 진하게 그린다
 */
function Histogram({ d }: { d: SearchScores }) {
  const g = d.grayZone
  const max = Math.max(1, ...d.buckets.map((b) => b.count))
  const line = Math.min(100, Math.max(0, d.threshold * 100))
  const questionNote = g
    ? `질문만 비교한 점수(${score(g.questionPass)} 이상 통과, ${score(g.questionFloor)}~${score(g.questionPass)} 판정)도 같이 쓰지만 그래프에는 없어요`
    : ''

  return (
    <Card className="flex flex-col gap-4 px-5 py-4">
      <div>
        {g ? (
          // 규칙(0.69·0.80)은 아래 띠와 수치 줄이 보여 줘 설명은 한 줄만 쓰고, 그래프에 없는 질문 벡터 기준은 제목 옆 ⓘ에 둔다
          <>
            <div className="flex items-center gap-1.5">
              <h2 className="text-[17px] font-extrabold">검색 점수 분포</h2>
              <span className="text-ink-muted" title={questionNote} aria-label={questionNote} role="img">
                <Info size={15} aria-hidden />
              </span>
            </div>
            <p className="text-[13px] text-ink-muted">질문마다 가장 비슷한 FAQ의 점수(질문+답변 기준) 분포예요 · 막대 색은 아래 띠의 답변 규칙이에요</p>
          </>
        ) : (
          <>
            <h2 className="text-[17px] font-extrabold">Q_A 1위 점수 분포</h2>
            <p className="text-[13px] text-ink-muted">질문마다 가장 비슷한 FAQ의 점수(질문+답변 벡터, 0~1)를 0.05 간격으로 나눠 센 질문 수예요</p>
            <p className="text-[13px] text-ink-muted">
              {d.scored.toLocaleString()}건 중 임계값 {score(d.threshold)} 이상 {d.aboveThreshold.toLocaleString()}건(
              {rate(d.aboveThreshold, d.scored)}) · 이 점수가 낮아도 질문 벡터로 통과했을 수 있어요
            </p>
          </>
        )}
      </div>
      <div className="flex flex-col">
        <div className="relative">
          <div className="flex h-48 items-end gap-1 border-b border-line">
            {d.buckets.map((b) => (
              <div
                key={b.min}
                className="group relative flex h-full flex-1 flex-col justify-end"
                title={`${score(b.min)} ~ ${score(b.max)}: ${b.count.toLocaleString()}건${
                  g ? ` · ${ZONE_LABEL[scoreZone(b.min, b.max, g.qaFloor, g.qaPass)]}(칸의 대부분이 속한 구간)` : ''
                }`}
              >
                {b.count > 0 && (
                  <span className="mb-1 text-center text-[10px] font-semibold text-ink-sub opacity-0 group-hover:opacity-100">
                    {b.count.toLocaleString()}
                  </span>
                )}
                <span
                  className={`block rounded-t-[3px] ${g ? '' : b.min >= d.threshold ? 'bg-brand' : 'bg-ink-muted opacity-40'}`}
                  style={{
                    height: `${(b.count / max) * 100}%`,
                    minHeight: b.count ? 2 : 0,
                    background: g ? ZONE[scoreZone(b.min, b.max, g.qaFloor, g.qaPass)].bg : undefined,
                  }}
                />
              </div>
            ))}
          </div>
          {/* 임계값 선. 값은 아래 수치 줄에 쓴다. 판정 구간이 있으면 비교용이라 옅게 그린다 */}
          <span
            aria-hidden
            className={`pointer-events-none absolute inset-y-0 border-l-2 border-dashed ${g ? 'border-ink-muted' : 'border-brand-strong'}`}
            style={{ left: `${line}%` }}
          />
        </div>
        {g && <RuleStrip g={g} />}
        {/* 수치 줄. 판정 구간 경계(0.69·0.80)는 첫 줄에 눈금과 함께, 가까이 붙은 판정 전 임계값은 겹치지 않게 둘째 줄에 쓴다 */}
        <div className="mt-1 flex flex-col text-[11px]">
          <div className="relative h-5 text-ink-muted">
            <Tick at={0} align="start" label="0" />
            <Tick at={0.25} label="0.25" />
            <Tick at={0.5} label="0.5" />
            <Tick at={1} align="end" label="1" />
            {g && <Tick at={g.qaFloor} label={score(g.qaFloor)} strong mark />}
            {g && <Tick at={g.qaPass} label={score(g.qaPass)} strong mark />}
            {!g && <Tick at={d.threshold} label={`임계값 ${score(d.threshold)}`} strong mark />}
          </div>
          {g && (
            <div className="relative h-5 text-ink-sub">
              <Tick at={d.threshold} label={`판정 전 임계값 ${score(d.threshold)} · 판정이 실패하면 이 값으로 정해요`} mark />
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}

/** 지금 답변 규칙(Q_A 기준)을 막대와 같은 0~1 폭에 정확한 경계로 그린 띠 */
function RuleStrip({ g }: { g: SearchScoreGrayZone }) {
  const pct = (v: number) => Math.min(100, Math.max(0, v * 100))
  const segments: { width: number; zone: ScoreZone }[] = [
    { width: pct(g.qaFloor), zone: 'drop' },
    { width: pct(g.qaPass) - pct(g.qaFloor), zone: 'judge' },
    { width: 100 - pct(g.qaPass), zone: 'pass' },
  ]
  return (
    <div className="mt-1.5 flex h-[22px] overflow-hidden rounded-md text-[11px] font-bold">
      {segments.map((s) => (
        <div
          key={s.zone}
          className={`flex items-center justify-center whitespace-nowrap ${ZONE[s.zone].text}`}
          style={{ width: `${s.width}%`, background: ZONE[s.zone].bg }}
        >
          {ZONE_LABEL[s.zone]}
        </div>
      ))}
    </div>
  )
}

/**
 * 수치 줄의 값 하나. align은 값 자리에서 글자를 어느 쪽으로 펼칠지(start: 오른쪽, end: 왼쪽, 기본은 가운데).
 * mark면 값 자리에 짧은 눈금을 그어 정확한 위치를 보인다
 */
function Tick({ at, label, align, strong, mark }: { at: number; label: string; align?: 'start' | 'end'; strong?: boolean; mark?: boolean }) {
  const shift = align === 'start' ? '0' : align === 'end' ? '-100%' : '-50%'
  const left = `${Math.min(100, Math.max(0, at * 100))}%`
  return (
    <>
      {mark && <span aria-hidden className="absolute top-0 h-1.5 border-l border-ink-sub" style={{ left }} />}
      <span
        className={`absolute top-1.5 whitespace-nowrap ${strong ? 'font-bold text-ink-sub' : ''}`}
        style={{ left, transform: `translateX(${shift})` }}
      >
        {label}
      </span>
    </>
  )
}
