import { useQuery } from '@tanstack/react-query'
import { Fragment, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { adminUnansweredApi, type UnansweredType } from '../../api/admin'
import { formatAdminTime } from '../../lib/date'
import { Badge, Card, Chip, Empty, FilterSelect, Pager, TableHead } from './components/AdminUi'
import { PERIODS, periodFrom, type Period } from './periods'
import SourceRows from './SourceRows'

const TYPES: [UnansweredType, string][] = [
  ['NO_EVIDENCE', '근거 없음'],
  ['OUT_OF_SCOPE', '범위 밖'],
  ['FAILED', '실패'],
  ['TIMEOUT', '시간 초과'],
]
const typeLabel = (t: string) => TYPES.find(([k]) => k === t)?.[1] ?? t
const typeTone = (t: string) => (t === 'NO_EVIDENCE' ? 'brand' : t === 'OUT_OF_SCOPE' ? 'notice' : 'danger') as 'brand' | 'notice' | 'danger'

const COLS = '110px 100px minmax(0,1fr) 96px'

/** 주소의 ?types=FAILED,TIMEOUT 을 읽는다 (대시보드 "실패한 답변"에서 들어올 때) */
const readTypes = (raw: string | null): UnansweredType[] =>
  (raw ?? '').split(',').filter((t): t is UnansweredType => TYPES.some(([k]) => k === t))

/** 답 못 한 질문 — 유형은 여러 개 고를 수 있다(비우면 전체). 근거가 없던 질문은 바로 FAQ로 추가할 수 있다 */
export default function UnansweredPanel() {
  const [params] = useSearchParams()
  const [types, setTypes] = useState<UnansweredType[]>(() => readTypes(params.get('types')))
  const [period, setPeriod] = useState<Period>('7')
  const [page, setPage] = useState(0)
  const [openId, setOpenId] = useState<number | null>(null)

  const query = { types, from: periodFrom(period), page, size: 20 }
  const list = useQuery({ queryKey: ['admin', 'unanswered', query], queryFn: () => adminUnansweredApi.list(query) })

  /** 유형 칩: 전체를 누르면 모두 해제, 나머지는 켜고 끈다. 다 켜지면 전체로 본다 */
  const pickTypes = (next: UnansweredType[]) => {
    setTypes(next.length === TYPES.length ? [] : TYPES.map(([k]) => k).filter((k) => next.includes(k)))
    setPage(0)
    setOpenId(null)
  }
  const toggleType = (t: UnansweredType) => pickTypes(types.includes(t) ? types.filter((x) => x !== t) : [...types, t])

  return (
    <>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-[13px] font-bold text-ink-sub">유형</span>
        <Chip on={types.length === 0} onClick={() => pickTypes([])}>
          전체
        </Chip>
        {TYPES.map(([k, label]) => (
          <Chip key={k} on={types.includes(k)} onClick={() => toggleType(k)}>
            {label}
          </Chip>
        ))}
        <span className="ml-1 text-xs text-ink-muted">여러 개 고를 수 있어요</span>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <FilterSelect
          label="기간"
          value={period}
          options={PERIODS}
          onChange={(v) => {
            setPeriod(v)
            setPage(0)
            setOpenId(null)
          }}
        />
        <span className="text-[13px] text-ink-muted">최신순</span>
      </div>
      <Card>
        <TableHead cols={COLS}>
          <span>질문 시각</span>
          <span>유형</span>
          <span>질문</span>
          <span />
        </TableHead>
        {list.isPending && <Empty>불러오는 중…</Empty>}
        {list.isError && <Empty>목록을 불러오지 못했어요.</Empty>}
        {list.data?.messages.length === 0 && <Empty>조건에 맞는 질문이 없어요.</Empty>}
        {list.data?.messages.map((m) => (
          <Fragment key={m.messageId}>
            <div
              className={`grid min-h-14 items-center gap-x-4 border-t border-line px-5 py-2 text-sm ${openId === m.messageId ? 'bg-surface-2' : ''}`}
              style={{ gridTemplateColumns: COLS }}
            >
              <span className="text-ink-sub">{formatAdminTime(m.createdAt)}</span>
              <span>
                <Badge tone={typeTone(m.type)}>{typeLabel(m.type)}</Badge>
              </span>
              <button
                type="button"
                aria-expanded={openId === m.messageId}
                onClick={() => setOpenId(openId === m.messageId ? null : m.messageId)}
                className="truncate text-left hover:underline"
              >
                {m.questionPreview}
              </button>
              <Link
                to={`/admin/faqs/new?question=${encodeURIComponent(m.questionPreview)}`}
                className="justify-self-end whitespace-nowrap rounded-[10px] border-[1.5px] border-line px-3 py-1.5 text-[13px] font-bold text-ink"
              >
                FAQ 추가
              </Link>
            </div>
            {openId === m.messageId && <UnansweredDetailRow id={m.messageId} />}
          </Fragment>
        ))}
        {list.data && list.data.totalElements > 0 && (
          <Pager page={page} totalPages={list.data.totalPages} total={list.data.totalElements} unit="건" onPage={setPage} />
        )}
      </Card>
    </>
  )
}

function UnansweredDetailRow({ id }: { id: number }) {
  const detail = useQuery({ queryKey: ['admin', 'unanswered', 'detail', id], queryFn: () => adminUnansweredApi.get(id) })
  const d = detail.data
  if (!d) {
    return (
      <div className="border-t border-line bg-surface-2 px-5 py-6 text-sm text-ink-sub">
        {detail.isPending ? '불러오는 중…' : '상세를 불러오지 못했어요.'}
      </div>
    )
  }
  return (
    <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-6 border-t border-line bg-surface-2 px-5 py-5 text-sm">
      <div className="flex flex-col gap-4">
        <section>
          <h3 className="mb-1.5 text-xs font-bold text-ink-muted">질문 전체</h3>
          <p className="whitespace-pre-line rounded-xl bg-surface px-4 py-3">{d.question}</p>
        </section>
        <section>
          <h3 className="mb-1.5 text-xs font-bold text-ink-muted">무러바라의 답변</h3>
          <p className="whitespace-pre-line rounded-xl bg-surface px-4 py-3 leading-6">{d.answer || '답변이 만들어지지 않았어요'}</p>
        </section>
      </div>
      <div className="flex flex-col gap-4">
        <section>
          <h3 className="mb-1.5 text-xs font-bold text-ink-muted">검색된 FAQ</h3>
          <SourceRows sources={d.sources} />
        </section>
        <Link
          to={`/admin/faqs/new?question=${encodeURIComponent(d.question)}`}
          className="inline-flex h-11 items-center justify-center rounded-[14px] bg-brand text-[15px] font-bold text-white"
        >
          이 질문으로 FAQ 추가
        </Link>
      </div>
    </div>
  )
}
