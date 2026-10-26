import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Plus, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { adminFaqApi, categoryLabel, FAQ_CATEGORIES, type FaqCategory, type FaqSort, type FaqStatusFilter } from '../../api/admin'
import { Badge, Card, Chip, Empty, FilterSelect, PageHeader, Pager, TableHead, primaryBtn } from '../../features/admin/components/AdminUi'
import { FAQ_STATUS_LABEL, faqStatusTone } from '../../features/admin/faqStatus'
import { formatAdminTime } from '../../lib/date'

const STATUSES = [
  ['ACTIVE', '사용 중'],
  ['HIDDEN', '숨김'],
  ['DELETED', '삭제됨'],
  ['ALL', '전체'],
] as const
const SORTS = [
  ['RECENT', '최근 수정순'],
  ['CITATION_DESC', '인용 많은 순'],
  ['CITATION_ASC', '인용 적은 순'],
] as const
const COLS = '64px 100px minmax(0,1fr) 90px 110px 84px'

/** FAQ 관리 목록 (시안 AdminFaqs) */
export default function AdminFaqListPage() {
  const navigate = useNavigate()
  const [input, setInput] = useState('')
  const [keyword, setKeyword] = useState('')
  const [category, setCategory] = useState<FaqCategory | null>(null)
  const [status, setStatus] = useState<FaqStatusFilter>('ACTIVE')
  const [sort, setSort] = useState<FaqSort>('RECENT')
  const [page, setPage] = useState(0)

  // 입력이 멈추면 검색
  useEffect(() => {
    const t = window.setTimeout(() => {
      setKeyword(input.trim())
      setPage(0)
    }, 300)
    return () => window.clearTimeout(t)
  }, [input])

  const query = { keyword: keyword || undefined, category: category ?? undefined, status, sort, page, size: 20 }
  const list = useQuery({
    queryKey: ['admin', 'faqs', query],
    queryFn: () => adminFaqApi.list(query),
    placeholderData: keepPreviousData,
  })

  return (
    <>
      <PageHeader
        title="FAQ 관리"
        desc="무러바라가 답변의 근거로 쓰는 FAQ예요. 인용이 없는 FAQ는 내용을 다시 살펴보세요."
        actions={
          <Link to="/admin/faqs/new" className={primaryBtn}>
            <Plus size={18} strokeWidth={2.2} aria-hidden />새 FAQ
          </Link>
        }
      />
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex h-10 w-full max-w-[320px] min-w-[200px] flex-1 items-center gap-2 rounded-full border-[1.5px] border-line bg-surface px-3.5 text-ink-sub focus-within:border-brand">
          <Search size={16} aria-hidden />
          <span className="sr-only">검색</span>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="질문이나 내용으로 검색"
            maxLength={200}
            className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-muted"
          />
        </label>
        <FilterSelect label="상태" value={status} options={STATUSES} onChange={(v) => (setStatus(v), setPage(0))} />
        <FilterSelect label="정렬" value={sort} options={SORTS} onChange={(v) => (setSort(v), setPage(0))} />
      </div>
      <div className="flex flex-wrap gap-1.5">
        <Chip on={category === null} onClick={() => (setCategory(null), setPage(0))}>
          전체
        </Chip>
        {FAQ_CATEGORIES.map(([k, label]) => (
          <Chip key={k} on={category === k} onClick={() => (setCategory(k), setPage(0))}>
            {label}
          </Chip>
        ))}
      </div>
      <Card>
        <TableHead cols={COLS}>
          <span>번호</span>
          <span>카테고리</span>
          <span>질문</span>
          <span>인용 횟수</span>
          <span>수정일</span>
          <span>상태</span>
        </TableHead>
        {list.isPending && <Empty>불러오는 중…</Empty>}
        {list.isError && <Empty>목록을 불러오지 못했어요.</Empty>}
        {list.data?.faqs.length === 0 && <Empty>조건에 맞는 FAQ가 없어요.</Empty>}
        {list.data?.faqs.map((f) => (
          <button
            key={f.faqId}
            type="button"
            onClick={() => navigate(`/admin/faqs/${f.faqId}`)}
            className="grid min-h-14 w-full items-center gap-x-4 border-t border-line px-5 py-2 text-left text-sm hover:bg-surface-2"
            style={{ gridTemplateColumns: COLS }}
          >
            <span className="text-ink-muted">#{f.faqId}</span>
            <span className="font-semibold text-ink-sub">{categoryLabel(f.category)}</span>
            <span className="truncate font-medium">{f.question}</span>
            <span className={f.citationCount === 0 ? 'font-bold text-danger' : ''}>{f.citationCount.toLocaleString()}회</span>
            <span className="text-ink-sub">{formatAdminTime(f.updatedAt)}</span>
            <span>
              <Badge tone={faqStatusTone(f.status)}>{FAQ_STATUS_LABEL[f.status]}</Badge>
            </span>
          </button>
        ))}
        {list.data && list.data.totalElements > 0 && (
          <Pager page={page} totalPages={list.data.totalPages} total={list.data.totalElements} unit="건" onPage={setPage} />
        )}
      </Card>
    </>
  )
}
