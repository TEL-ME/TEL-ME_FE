import { useQuery, useQueryClient } from '@tanstack/react-query'
import { CircleAlert, RotateCw } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { adminFaqApi, FAQ_CATEGORIES, type FaqCategory, type FaqDetail } from '../../api/admin'
import { ApiError } from '../../api/client'
import ConfirmDialog from '../../components/ConfirmDialog'
import { Badge, Card, Chip, primaryBtn, secondaryBtn } from '../../features/admin/components/AdminUi'
import { FAQ_STATUS_LABEL, faqStatusTone } from '../../features/admin/faqStatus'
import { formatAdminTime } from '../../lib/date'
import { showToast } from '../../stores/toastStore'

/** FAQ 등록·수정 (시안 AdminFaqNew / AdminFaqEdit / AdminFaqConflict / AdminFaqDelete) */
export default function AdminFaqEditPage() {
  const { faqId } = useParams()
  const id = faqId ? Number(faqId) : null
  const detail = useQuery({
    queryKey: ['admin', 'faq', id],
    queryFn: () => adminFaqApi.get(id!),
    enabled: id != null,
    staleTime: 0,
  })

  if (id != null && detail.isPending) return <p className="text-sm text-ink-sub">불러오는 중…</p>
  if (id != null && !detail.data) {
    return (
      <p className="text-sm text-ink-sub">
        FAQ를 찾을 수 없어요. <Link to="/admin/faqs" className="font-bold text-brand-strong underline">목록으로</Link>
      </p>
    )
  }
  // key: 다시 불러오면 폼을 최신 내용으로 새로 채운다
  return <FaqForm key={detail.data ? `${detail.data.faqId}-${detail.data.lockVersion}` : 'new'} faq={detail.data ?? null} />
}

function FaqForm({ faq }: { faq: FaqDetail | null }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [params] = useSearchParams()
  const [category, setCategory] = useState<FaqCategory | null>(faq?.category ?? null)
  const [question, setQuestion] = useState(faq?.question ?? params.get('question') ?? '')
  const [answer, setAnswer] = useState(faq?.answer ?? '')
  const [policyRef, setPolicyRef] = useState(faq?.policyRef ?? '')
  const [error, setError] = useState<string | null>(null)
  const [conflict, setConflict] = useState(false)
  const [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState<'delete' | 'purge' | null>(null)

  const refreshAll = async () => {
    await queryClient.invalidateQueries({ queryKey: ['admin', 'faqs'] })
    if (faq) await queryClient.invalidateQueries({ queryKey: ['admin', 'faq', faq.faqId] })
  }

  /** 공통 오류 처리: 동시 수정(FAQ409-1)은 배너로, 나머지는 메시지로 */
  const run = async (action: () => Promise<unknown>, done: string, after?: () => void) => {
    setBusy(true)
    setError(null)
    try {
      await action()
      showToast(done)
      await refreshAll()
      after?.()
    } catch (e) {
      if (e instanceof ApiError && e.code === 'FAQ409-1') setConflict(true)
      else setError(e instanceof ApiError ? e.message : '저장하지 못했어요. 잠시 후 다시 시도해 주세요.')
    } finally {
      setBusy(false)
      setConfirm(null)
    }
  }

  const save = () => {
    if (!category) return setError('카테고리를 골라 주세요')
    if (!question.trim() || !answer.trim()) return setError('질문과 답변을 입력해 주세요')
    const body = { category, question, answer, policyRef: policyRef.trim() || null, lockVersion: faq?.lockVersion }
    if (faq) void run(() => adminFaqApi.update(faq.faqId, body), 'FAQ를 저장했어요')
    else
      void run(
        async () => {
          const created = await adminFaqApi.create({ ...body, status: 'ACTIVE' })
          navigate(`/admin/faqs/${created.faqId}`, { replace: true })
        },
        'FAQ를 등록했어요',
      )
  }

  const reload = async () => {
    setConflict(false)
    await queryClient.invalidateQueries({ queryKey: ['admin', 'faq', faq?.faqId] })
  }

  const deleted = faq?.status === 'DELETED'

  return (
    // 화면 가운데에 둔다. 새 FAQ는 오른쪽 기록 카드가 없어 폼만 좁게
    <div className={`mx-auto flex w-full flex-col gap-5 ${faq ? 'max-w-[1180px]' : 'max-w-[880px]'}`}>
      <header className="flex flex-col gap-1">
        <p className="text-[13px] text-ink-sub">
          <Link to="/admin/faqs" className="underline underline-offset-2">FAQ 관리</Link> › {faq ? `#${faq.faqId}` : '새 FAQ'}
        </p>
        <h1 className="text-[26px] font-extrabold leading-[34px] tracking-[-0.5px]">{faq ? 'FAQ 수정' : 'FAQ 등록'}</h1>
      </header>

      {conflict && (
        <div role="alert" className="flex items-center gap-3 rounded-[14px] bg-brand-soft px-4 py-3 text-sm font-semibold text-brand-strong">
          <CircleAlert size={18} aria-hidden className="shrink-0" />
          <span className="flex-1">다른 관리자가 먼저 수정해서 저장하지 못했어요. 최신 내용을 불러온 뒤 다시 고쳐 주세요.</span>
          <button type="button" onClick={reload} className="flex items-center gap-1.5 rounded-[10px] bg-surface px-3 py-1.5 text-ink">
            <RotateCw size={14} aria-hidden />
            최신 내용 불러오기
          </button>
        </div>
      )}

      <div className={faq ? 'grid grid-cols-[minmax(0,1fr)_300px] items-start gap-6' : 'flex flex-col'}>
        <Card className="flex flex-col gap-5 p-6">
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-[13px] font-bold text-ink-sub">카테고리</legend>
            <div className="flex flex-wrap gap-1.5">
              {FAQ_CATEGORIES.map(([k, label]) => (
                <Chip key={k} on={category === k} onClick={() => setCategory(k)}>
                  {label}
                </Chip>
              ))}
            </div>
          </fieldset>
          <label className="flex flex-col gap-2 text-[13px] font-bold text-ink-sub">
            질문
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              maxLength={500}
              className="h-11 rounded-xl border-[1.5px] border-line bg-surface px-3.5 text-[15px] font-normal text-ink outline-none focus:border-brand"
            />
          </label>
          <label className="flex flex-col gap-2 text-[13px] font-bold text-ink-sub">
            답변
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              maxLength={5000}
              rows={9}
              className="resize-y rounded-xl border-[1.5px] border-line bg-surface px-3.5 py-3 text-[15px] font-normal leading-6 text-ink outline-none focus:border-brand"
            />
            <span className="self-end text-xs font-normal text-ink-muted">{answer.length.toLocaleString()} / 5,000</span>
          </label>
          <label className="flex flex-col gap-2 text-[13px] font-bold text-ink-sub">
            <span>
              정책 근거 <span className="font-normal text-ink-muted">(선택, 예: POL-USIM-03)</span>
            </span>
            <input
              value={policyRef}
              onChange={(e) => setPolicyRef(e.target.value)}
              maxLength={50}
              className="h-11 w-[260px] rounded-xl border-[1.5px] border-line bg-surface px-3.5 text-[15px] font-normal text-ink outline-none focus:border-brand"
            />
          </label>
          <p className="text-[13px] text-ink-muted">저장하면 검색에 쓰는 데이터를 다시 만들어요. 반영까지 잠깐 걸릴 수 있어요.</p>
          {error && (
            <p role="alert" className="text-[13px] font-semibold text-danger">
              {error}
            </p>
          )}
          <div className="flex items-center gap-2">
            {faq && !deleted && (
              <button type="button" disabled={busy} onClick={() => setConfirm('delete')} className={`${secondaryBtn} text-danger`}>
                삭제
              </button>
            )}
            <span className="flex-1" />
            <Link to="/admin/faqs" className={secondaryBtn}>
              취소
            </Link>
            {!deleted && (
              <button type="button" disabled={busy} onClick={save} className={primaryBtn}>
                {busy ? '저장 중…' : faq ? '저장' : '등록'}
              </button>
            )}
          </div>
        </Card>

        {faq && (
          <Card className="flex flex-col gap-3 p-5 text-sm">
            <h2 className="text-[15px] font-extrabold">이 FAQ의 기록</h2>
            <dl className="grid grid-cols-[80px_1fr] gap-y-2">
              <dt className="text-ink-muted">인용 횟수</dt>
              <dd className="font-semibold">{faq.citationCount.toLocaleString()}회</dd>
              <dt className="text-ink-muted">버전</dt>
              <dd>{faq.version}</dd>
              <dt className="text-ink-muted">마지막 수정</dt>
              <dd>{formatAdminTime(faq.updatedAt)}</dd>
              <dt className="text-ink-muted">상태</dt>
              <dd>
                <Badge tone={faqStatusTone(faq.status)}>{FAQ_STATUS_LABEL[faq.status]}</Badge>
              </dd>
            </dl>
            {faq.status === 'ACTIVE' && (
              <button type="button" disabled={busy} className={secondaryBtn}
                onClick={() => void run(() => adminFaqApi.setStatus(faq.faqId, 'HIDDEN', faq.lockVersion), '숨겼어요. 답변에 쓰지 않아요')}>
                숨기기
              </button>
            )}
            {faq.status === 'HIDDEN' && (
              <button type="button" disabled={busy} className={secondaryBtn}
                onClick={() => void run(() => adminFaqApi.setStatus(faq.faqId, 'ACTIVE', faq.lockVersion), '다시 사용해요')}>
                다시 사용하기
              </button>
            )}
            {deleted && (
              <>
                <button type="button" disabled={busy} className={primaryBtn}
                  onClick={() => void run(() => adminFaqApi.setStatus(faq.faqId, 'ACTIVE', faq.lockVersion), 'FAQ를 복구했어요')}>
                  복구
                </button>
                <button type="button" disabled={busy || faq.citationCount > 0} onClick={() => setConfirm('purge')} className={`${secondaryBtn} text-danger`}>
                  영구 삭제
                </button>
                {faq.citationCount > 0 && <p className="text-xs text-ink-muted">답변 근거로 쓰인 적이 있어 영구 삭제할 수 없어요.</p>}
              </>
            )}
            <p className="text-xs leading-[18px] text-ink-muted">이미 나간 답변의 ‘참고한 정보’에는 그때의 제목이 그대로 남아요.</p>
          </Card>
        )}
      </div>

      <ConfirmDialog
        open={confirm === 'delete'}
        title="이 FAQ를 삭제할까요?"
        confirmLabel="삭제"
        onCancel={() => setConfirm(null)}
        onConfirm={() => faq && void run(() => adminFaqApi.remove(faq.faqId, faq.lockVersion), 'FAQ를 삭제했어요', () => navigate('/admin/faqs'))}
      >
        삭제하면 무러바라가 답변할 때 더는 쓰지 않아요. 상태 필터의 ‘삭제됨’에서 다시 찾아 복구할 수 있어요.
      </ConfirmDialog>
      <ConfirmDialog
        open={confirm === 'purge'}
        title="영구 삭제할까요?"
        confirmLabel="영구 삭제"
        onCancel={() => setConfirm(null)}
        onConfirm={() => faq && void run(() => adminFaqApi.purge(faq.faqId, faq.lockVersion), 'FAQ를 영구 삭제했어요', () => navigate('/admin/faqs'))}
      >
        되돌릴 수 없어요. 이 FAQ가 데이터베이스에서 완전히 사라져요.
      </ConfirmDialog>
    </div>
  )
}
