import { ChevronDown, X } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { ApiError } from '../../../api/client'
import type { ModelAttempt, MonitoringDetail, TimelineEntry } from '../../../api/adminMonitoring'
import { Badge } from '../components/AdminUi'
import { useMonitoringDetail } from './queries'
import StageCell from './StageCell'
import { STAGE_COLUMNS, STATUS_BADGE, attemptFailed, formatElapsed, kstDay, kstTime, stageName, taskName, whoLabel } from './stages'

type Obj = Record<string, unknown>
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v != null && !Array.isArray(v)
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : [])
const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v : null)
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null)

/** 오른쪽 상세 패널: 질문 하나가 지나간 단계·시간·모델 호출·단계별 기록 */
export default function ExecutionPanel({ executionId, onClose }: { executionId: number; onClose: () => void }) {
  const q = useMonitoringDetail(executionId)
  const d = q.data

  return (
    <aside
      aria-label="처리 상세"
      className="sticky top-7 flex max-h-[calc(100vh-56px)] w-[440px] shrink-0 flex-col overflow-hidden rounded-card border-[1.5px] border-line bg-surface"
    >
      <header className="flex items-center gap-2 border-b border-line px-5 py-3.5">
        <h2 className="text-[15px] font-extrabold">실행 #{executionId}</h2>
        {d && <Badge tone={STATUS_BADGE[d.status]?.tone ?? 'muted'}>{STATUS_BADGE[d.status]?.label ?? d.status}</Badge>}
        {d?.status === 'RUNNING' && <span className="text-xs text-ink-muted">3초마다 갱신 중</span>}
        <button type="button" aria-label="상세 닫기" onClick={onClose} className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg text-ink-sub hover:bg-surface-2">
          <X size={18} aria-hidden />
        </button>
      </header>
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {q.isError ? (
          <p className="py-10 text-center text-sm text-ink-sub">
            {q.error instanceof ApiError && q.error.status === 404 ? '실행 기록을 찾을 수 없어요.' : '상세를 불러오지 못했어요.'}
          </p>
        ) : !d ? (
          <p className="tm-pulse py-10 text-center text-sm text-ink-sub">불러오는 중…</p>
        ) : (
          <Detail d={d} />
        )}
      </div>
    </aside>
  )
}

function Detail({ d }: { d: MonitoringDetail }) {
  const steps = isObj(d.steps) ? d.steps : {}
  return (
    <div className="flex flex-col gap-5">
      <dl className="grid grid-cols-[72px_1fr] gap-x-3 gap-y-1.5 text-[13px]">
        <dt className="text-ink-muted">사용자</dt>
        <dd>{whoLabel(d)}</dd>
        <dt className="text-ink-muted">대화</dt>
        <dd>#{d.sessionId}</dd>
        <dt className="text-ink-muted">시작</dt>
        <dd>
          {kstDay(d.startedAt)} {kstTime(d.startedAt)} <span className="text-ink-muted">KST</span>
        </dd>
        <dt className="text-ink-muted">소요</dt>
        <dd className="font-semibold">
          {formatElapsed(d.elapsedMs)}
          {d.status === 'RUNNING' && <span className="font-normal text-ink-muted"> (진행 중)</span>}
        </dd>
        {d.errorCode && (
          <>
            <dt className="text-ink-muted">오류</dt>
            <dd className="font-mono text-danger">{d.errorCode}</dd>
          </>
        )}
      </dl>

      <div className="grid grid-cols-4 gap-x-1.5 gap-y-2">
        {STAGE_COLUMNS.map((c) => (
          <div key={c.key} className="flex min-w-0 flex-col gap-1">
            <span className="truncate text-[11px] font-bold text-ink-muted">{c.label}</span>
            <StageCell cell={d.stages?.[c.key]} title={c.label} />
          </div>
        ))}
      </div>

      <Block title="질문">
        <p className="whitespace-pre-wrap break-words rounded-xl bg-surface-2 px-3.5 py-3 text-sm leading-[22px]">
          {d.originalUserMessage ?? '–'}
        </p>
        {d.inputCheckActions && d.inputCheckActions.length > 0 && (
          <p className="text-xs text-ink-muted">입력 검사 조치: {d.inputCheckActions.join(', ')}</p>
        )}
      </Block>

      <Block title="처리 시간">
        <Timeline d={d} />
      </Block>

      <Block title="최종 답변">
        {d.finalAnswer ? (
          <Collapsible text={d.finalAnswer} />
        ) : (
          <p className="text-sm text-ink-muted">{d.status === 'RUNNING' ? '아직 답변을 만들고 있어요' : '답변이 없어요'}</p>
        )}
      </Block>

      {d.routing.length > 0 && (
        <Fold title="분석 · 라우팅" count={d.routing.length}>
          {d.routing.map((r, i) => (
            <KeyValues key={i} rows={[['의도', r.intent], ['방법', r.method], ['확신도', r.confidence != null ? r.confidence.toFixed(2) : null], ['검색 문장', r.refinedQuery]]} />
          ))}
          {isObj(steps.analysis) && (
            <KeyValues
              rows={[
                ['처리', str(steps.analysis.action)],
                ['목적', str(steps.analysis.purpose)],
                ['원래 질문', str(steps.analysis.originalQuery)],
                ['복원한 질문', str(steps.analysis.resolvedQuery)],
              ]}
            />
          )}
        </Fold>
      )}
      <SearchFold value={steps.searchResults} />
      <JudgmentFold value={steps.grayZoneJudgments} />
      <GenerationFold value={steps.generationInputs} />
      {isObj(steps.guard) && (
        <Fold title="답변 검사">
          <KeyValues rows={[['결과', str(steps.guard.outcome)], ['이유', str(steps.guard.reason)]]} />
        </Fold>
      )}
      {d.steps && Object.keys(d.steps).some((k) => k !== 'timeline') && (
        <Fold title="원본 기록 (JSON)">
          <pre className="max-h-[320px] overflow-auto rounded-xl bg-surface-2 p-3 text-[11px] leading-4">{JSON.stringify(d.steps, null, 2)}</pre>
        </Fold>
      )}
    </div>
  )
}

/** 처리 시간: 단계 기록 사이 간격을 막대로, 모델 호출은 createdAt − totalMs ~ createdAt */
function Timeline({ d }: { d: MonitoringDetail }) {
  const start = Date.parse(d.startedAt)
  const calls = d.modelAttempts
    .map((m) => {
      const end = Date.parse(m.createdAt) - start
      const total = m.totalMs ?? 0
      return { m, from: Math.max(0, end - total), to: Math.max(0, end) }
    })
    .filter((c) => Number.isFinite(c.to))
  // 시각을 읽지 못한 기록(elapsedMs null)은 막대에서 뺀다
  const marks = d.timeline.filter((t): t is TimelineEntry & { elapsedMs: number } => t.elapsedMs != null)
  const total = Math.max(1, d.elapsedMs ?? 0, ...marks.map((t) => t.elapsedMs), ...calls.map((c) => c.to))
  const pct = (ms: number) => `${Math.min(100, (ms / total) * 100)}%`

  // 단계는 끝날 때 기록된다: 앞 기록 ~ 이번 기록이 이 단계에 걸린 시간 (예: analysis 18.5초 = 분석에 18.5초)
  const spans = marks.map((t, i) => {
    const prev = i > 0 ? marks[i - 1].elapsedMs : 0
    return { t, from: prev, dur: Math.max(0, t.elapsedMs - prev) }
  })
  const slowest = Math.max(0, ...spans.map((s) => s.dur))

  return (
    <div className="flex flex-col gap-3">
      {spans.length === 0 ? (
        <p className="rounded-xl bg-surface-2 px-3.5 py-3 text-[13px] text-ink-sub">
          단계 시각 없음{d.traceRecorded ? '' : ' (처리 기록이 남지 않은 질문이에요)'}
        </p>
      ) : (
        <ol className="m-0 flex list-none flex-col gap-1 p-0">
          {spans.map(({ t, from, dur }, i) => {
            const slow = dur === slowest && dur > 1000
            return (
              <li key={i} className="grid grid-cols-[104px_1fr_52px] items-center gap-2 text-xs">
                <span className="truncate text-ink-sub" title={t.stage ?? undefined}>
                  {stageName(t.stage)}
                </span>
                <span className="relative h-3.5 rounded bg-surface-2">
                  <span
                    className={`absolute inset-y-0 rounded ${slow ? 'bg-[#e0a10b]' : 'bg-[#3b7ddd]'}`}
                    style={{ left: pct(from), width: `max(2px, ${pct(dur)})` }}
                  />
                </span>
                <span className={`text-right tabular-nums ${slow ? 'font-bold text-[#8a5a00] dark:text-[#f2cd6b]' : 'text-ink-muted'}`}>
                  {formatElapsed(dur)}
                </span>
              </li>
            )
          })}
        </ol>
      )}
      {calls.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-bold text-ink-muted">모델 호출</span>
          {calls.map(({ m, from, to }, i) => (
            <ModelBar key={i} m={m} left={pct(from)} width={pct(to - from)} />
          ))}
        </div>
      )}
      <div className="flex justify-between text-[10px] text-ink-muted">
        <span>0</span>
        <span>{formatElapsed(total)}</span>
      </div>
    </div>
  )
}

function ModelBar({ m, left, width }: { m: ModelAttempt; left: string; width: string }) {
  const failed = attemptFailed(m.status)
  return (
    <div
      className="grid grid-cols-[104px_1fr_52px] items-center gap-2 text-xs"
      title={[
        m.model,
        m.promptVersion,
        m.firstTokenMs != null ? `첫 글자 ${formatElapsed(m.firstTokenMs)}` : null,
        m.contextCount != null ? `근거 ${m.contextCount}개` : null,
        m.status,
      ]
        .filter(Boolean)
        .join(' · ')}
    >
      <span className={`truncate ${failed ? 'font-semibold text-danger' : 'text-ink-sub'}`}>{taskName(m.taskType)}</span>
      <span className="relative h-3.5 rounded bg-surface-2">
        <span className={`absolute inset-y-0 rounded ${failed ? 'bg-[#d64545]' : 'bg-[#8b6ad8]'}`} style={{ left, width: `max(2px, ${width})` }} />
      </span>
      <span className="text-right tabular-nums text-ink-muted">{formatElapsed(m.totalMs)}</span>
    </div>
  )
}

function SearchFold({ value }: { value: unknown }) {
  const results = arr(value).filter(isObj)
  if (results.length === 0) return null
  return (
    <Fold title="검색" count={results.length}>
      {results.map((r, i) => {
        const sources = arr(r.sources).filter(isObj)
        return (
          <div key={i} className="flex flex-col gap-1.5">
            <p className="text-[13px]">
              <span className="font-semibold">{str(r.query) ?? '(검색어 없음)'}</span>
              <span className="text-ink-muted"> · {[str(r.kind), str(r.status)].filter(Boolean).join(' · ')}</span>
            </p>
            {sources.length > 0 && (
              <ul className="m-0 flex list-none flex-col gap-1 p-0">
                {sources.map((s, j) => (
                  <li key={j} className="flex items-start gap-2 rounded-lg bg-surface-2 px-2.5 py-2 text-xs">
                    <span className="shrink-0 font-mono text-ink-muted">#{num(s.searchRank) ?? j + 1}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{str(s.question) ?? `FAQ ${num(s.faqId) ?? ''}`}</span>
                      <span className="text-ink-muted">
                        {[str(s.category), num(s.faqId) != null ? `FAQ ${num(s.faqId)}` : null, str(s.matchedVariant)].filter(Boolean).join(' · ')}
                      </span>
                    </span>
                    {num(s.score) != null && <span className="shrink-0 font-mono font-semibold">{num(s.score)!.toFixed(3)}</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )
      })}
    </Fold>
  )
}

const VERDICT: Record<string, string> = { ANSWERABLE: '답변 가능', NOT_ANSWERABLE: '답변 불가', FAILED: '판정 실패' }

function JudgmentFold({ value }: { value: unknown }) {
  const judgments = arr(value)
    .filter(isObj)
    .flatMap((g) => arr(g.judgments).filter(isObj))
  if (judgments.length === 0) return null
  return (
    <Fold title="회색 구간 판정" count={judgments.length}>
      <ul className="m-0 flex list-none flex-col gap-1 p-0">
        {judgments.map((j, i) => (
          <li key={i} className="flex items-center gap-2 rounded-lg bg-surface-2 px-2.5 py-2 text-xs">
            <span className="font-mono text-ink-muted">FAQ {num(j.faqId) ?? '?'}</span>
            <span className="font-mono">{num(j.score)?.toFixed(3) ?? '–'}</span>
            <span className={`ml-auto font-bold ${j.kept === true ? 'text-[#1c6e4c] dark:text-[#8fdcb8]' : 'text-ink-sub'}`}>
              {VERDICT[str(j.verdict) ?? ''] ?? str(j.verdict) ?? '판정 없음'}
              {j.kept === true ? ' · 사용' : j.kept === false ? ' · 제외' : ''}
            </span>
            {num(j.elapsedMs) != null && <span className="text-ink-muted">{formatElapsed(num(j.elapsedMs))}</span>}
          </li>
        ))}
      </ul>
    </Fold>
  )
}

function GenerationFold({ value }: { value: unknown }) {
  const inputs = arr(value).filter(isObj)
  if (inputs.length === 0) return null
  return (
    <Fold title="답변 생성" count={inputs.length}>
      {inputs.map((g, i) => (
        <KeyValues
          key={i}
          rows={[
            ['질문', str(g.userQuery)],
            ['복원한 질문', str(g.resolvedQuery)],
            ['프롬프트', str(g.promptVersion)],
            ['근거', Array.isArray(g.sources) ? `${g.sources.length}개` : null],
          ]}
        />
      ))}
    </Fold>
  )
}

// ---- 작은 조각 ----

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-xs font-bold text-ink-muted">{title}</h3>
      {children}
    </section>
  )
}

function Fold({ title, count, children }: { title: string; count?: number; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <section className="border-t border-line pt-3">
      <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-1.5 text-left text-[13px] font-bold">
        {title}
        {count != null && <span className="font-semibold text-ink-muted">{count}</span>}
        <ChevronDown size={16} aria-hidden className={`ml-auto text-ink-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="mt-2.5 flex flex-col gap-2.5">{children}</div>}
    </section>
  )
}

/** 값이 있는 줄만 */
function KeyValues({ rows }: { rows: [string, string | null][] }) {
  const shown = rows.filter(([, v]) => v != null && v !== '')
  if (shown.length === 0) return null
  return (
    <dl className="grid grid-cols-[80px_1fr] gap-x-3 gap-y-1 rounded-lg bg-surface-2 px-3 py-2.5 text-xs">
      {shown.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-ink-muted">{k}</dt>
          <dd className="break-words">{v}</dd>
        </div>
      ))}
    </dl>
  )
}

function Collapsible({ text }: { text: string }) {
  const [open, setOpen] = useState(false)
  const long = text.length > 220
  return (
    <div className="flex flex-col gap-1.5">
      <p className="whitespace-pre-wrap break-words rounded-xl bg-surface-2 px-3.5 py-3 text-sm leading-[22px]">
        {long && !open ? `${text.slice(0, 220)}…` : text}
      </p>
      {long && (
        <button type="button" onClick={() => setOpen((o) => !o)} className="self-start text-xs font-semibold text-ink-sub underline underline-offset-2">
          {open ? '접기' : '전체 보기'}
        </button>
      )}
    </div>
  )
}
