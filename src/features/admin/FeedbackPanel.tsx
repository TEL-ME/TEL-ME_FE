import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Fragment, useState } from 'react'
import { adminFeedbackApi, type HandledFilter, type ReasonCode } from '../../api/admin'
import { ApiError } from '../../api/client'
import { formatAdminTime } from '../../lib/date'
import { showToast } from '../../stores/toastStore'
import { Badge, Card, Chip, Empty, FilterSelect, Pager, TableHead, primaryBtn, secondaryBtn } from './components/AdminUi'
import { PERIODS, periodFrom, type Period } from './periods'
import SourceRows from './SourceRows'

const REASONS = [
  ['ALL', '전체'],
  ['WRONG_INFO', '정보가 정확하지 않아요'],
  ['NOT_RELATED', '질문과 관련이 없어요'],
  ['HARD_TO_READ', '이해하기 어려워요'],
] as const
const reasonLabel = (r: string) => REASONS.find(([k]) => k === r)?.[1] ?? r

const HANDLED = [
  ['UNHANDLED', '미처리'],
  ['HANDLED', '처리 완료'],
  ['ALL', '전체'],
] as const

const COLS = '110px 170px minmax(0,1.3fr) minmax(0,1fr) 84px'

/** 오류 신고(싫어요) 목록 — 줄을 누르면 아래로 펼쳐 상세를 보고 처리한다 */
export default function FeedbackPanel() {
  const [reason, setReason] = useState<ReasonCode | 'ALL'>('ALL')
  const [handled, setHandled] = useState<HandledFilter>('UNHANDLED')
  // 미처리 신고가 기간 때문에 숨지 않도록 기본은 전체 기간 (탭 숫자와 목록 건수가 같게)
  const [period, setPeriod] = useState<Period>('all')
  const [page, setPage] = useState(0)
  const [openId, setOpenId] = useState<number | null>(null)

  const query = { reason: reason === 'ALL' ? undefined : reason, handled, from: periodFrom(period), page, size: 20 }
  const list = useQuery({ queryKey: ['admin', 'feedbacks', query], queryFn: () => adminFeedbackApi.list(query) })
  const reset = <T,>(set: (v: T) => void) => (v: T) => {
    set(v)
    setPage(0)
    setOpenId(null)
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-[13px] font-bold text-ink-sub">사유</span>
        {REASONS.map(([k, label]) => (
          <Chip key={k} on={reason === k} onClick={() => reset(setReason)(k)}>
            {label}
          </Chip>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <FilterSelect label="기간" value={period} options={PERIODS} onChange={reset(setPeriod)} />
        <FilterSelect label="처리 상태" value={handled} options={HANDLED} onChange={reset(setHandled)} />
      </div>
      <Card>
        <TableHead cols={COLS}>
          <span>신고 시각</span>
          <span>사유</span>
          <span>질문</span>
          <span>사용자 의견</span>
          <span>상태</span>
        </TableHead>
        {list.isPending && <Empty>불러오는 중…</Empty>}
        {list.isError && <Empty>목록을 불러오지 못했어요.</Empty>}
        {list.data?.feedbacks.length === 0 && <Empty>조건에 맞는 신고가 없어요.</Empty>}
        {list.data?.feedbacks.map((f) => (
          <Fragment key={f.feedbackId}>
            <button
              type="button"
              aria-expanded={openId === f.feedbackId}
              onClick={() => setOpenId(openId === f.feedbackId ? null : f.feedbackId)}
              className={`grid min-h-14 w-full items-center gap-x-4 border-t border-line px-5 py-2 text-left text-sm ${
                openId === f.feedbackId ? 'bg-surface-2' : ''
              }`}
              style={{ gridTemplateColumns: COLS }}
            >
              <span className="text-ink-sub">{formatAdminTime(f.createdAt)}</span>
              <span className="font-semibold">{reasonLabel(f.reasonCode)}</span>
              <span className="truncate">{f.questionPreview}</span>
              <span className="truncate text-ink-sub">{f.commentPreview || '—'}</span>
              <span>{f.handled ? <Badge tone="muted">처리 완료</Badge> : <Badge tone="brand">미처리</Badge>}</span>
            </button>
            {openId === f.feedbackId && <FeedbackDetailRow id={f.feedbackId} />}
          </Fragment>
        ))}
        {list.data && list.data.totalElements > 0 && (
          <Pager page={page} totalPages={list.data.totalPages} total={list.data.totalElements} unit="건" onPage={setPage} />
        )}
      </Card>
      {handled === 'UNHANDLED' && <p className="text-[13px] text-ink-muted">처리 완료한 신고는 이 목록에서 사라져요.</p>}
    </>
  )
}

function FeedbackDetailRow({ id }: { id: number }) {
  const queryClient = useQueryClient()
  const detail = useQuery({ queryKey: ['admin', 'feedback', id], queryFn: () => adminFeedbackApi.get(id) })
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const d = detail.data

  const toggle = async () => {
    if (!d) return
    setSaving(true)
    try {
      await adminFeedbackApi.setHandled(id, !d.handled, d.updatedAt, note || undefined)
      showToast(d.handled ? '미처리로 되돌렸어요' : '처리 완료로 표시했어요')
      await queryClient.invalidateQueries({ queryKey: ['admin', 'feedbacks'] })
      await queryClient.invalidateQueries({ queryKey: ['admin', 'feedback', id] })
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        showToast('그 사이 사용자가 의견을 고쳤어요. 다시 확인해 주세요')
        await queryClient.invalidateQueries({ queryKey: ['admin', 'feedback', id] })
      } else showToast(e instanceof ApiError ? e.message : '저장하지 못했어요')
    } finally {
      setSaving(false)
    }
  }

  if (detail.isPending) return <div className="border-t border-line bg-surface-2 px-5 py-6 text-sm text-ink-sub">불러오는 중…</div>
  if (!d) return <div className="border-t border-line bg-surface-2 px-5 py-6 text-sm text-ink-sub">상세를 불러오지 못했어요.</div>

  return (
    <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-6 border-t border-line bg-surface-2 px-5 py-5 text-sm">
      <div className="flex flex-col gap-4">
        <section>
          <h3 className="mb-1.5 text-xs font-bold text-ink-muted">질문</h3>
          <p className="whitespace-pre-line rounded-xl bg-surface px-4 py-3">{d.question}</p>
        </section>
        <section>
          <h3 className="mb-1.5 text-xs font-bold text-ink-muted">무러바라의 답변</h3>
          <p className="whitespace-pre-line rounded-xl bg-surface px-4 py-3 leading-6">{d.answer}</p>
        </section>
        <section>
          <h3 className="mb-1.5 text-xs font-bold text-ink-muted">근거로 쓴 FAQ</h3>
          <SourceRows sources={d.sources} />
        </section>
      </div>
      <div className="flex flex-col gap-4">
        <section>
          <h3 className="mb-1.5 text-xs font-bold text-ink-muted">사용자 의견</h3>
          <p className="whitespace-pre-line rounded-xl bg-surface px-4 py-3">{d.comment || '남긴 의견이 없어요'}</p>
        </section>
        {d.handled ? (
          <section className="rounded-xl bg-surface px-4 py-3 text-ink-sub">
            {d.handledAt && `${formatAdminTime(d.handledAt)}에 처리 완료`}
            {d.handledNote && <p className="mt-1 text-ink">메모: {d.handledNote}</p>}
          </section>
        ) : (
          <label className="flex flex-col gap-1.5 text-xs font-bold text-ink-muted">
            처리 메모 (선택)
            <textarea
              rows={2}
              maxLength={500}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="예: FAQ #128 답변을 고쳤어요"
              className="resize-none rounded-xl border-[1.5px] border-line bg-surface px-3 py-2 text-sm font-normal text-ink outline-none focus:border-brand"
            />
          </label>
        )}
        <button type="button" disabled={saving} onClick={toggle} className={d.handled ? secondaryBtn : primaryBtn}>
          {d.handled ? '미처리로 되돌리기' : '처리 완료'}
        </button>
      </div>
    </div>
  )
}
