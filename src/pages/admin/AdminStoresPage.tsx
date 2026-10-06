import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Plus, Search, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { adminStoreApi, type StoreStatusFilter } from '../../api/admin'
import { Badge, Card, Empty, FilterSelect, PageHeader, Pager, primaryBtn, secondaryBtn, TableHead } from '../../features/admin/components/AdminUi'

const STATUSES = [
  ['OPEN', '영업'],
  ['CLOSED_DOWN', '폐점'],
  ['ALL', '전체'],
] as const
const DAY: Record<string, string> = {
  MONDAY: '월', TUESDAY: '화', WEDNESDAY: '수', THURSDAY: '목', FRIDAY: '금', SATURDAY: '토', SUNDAY: '일',
}
const COLS = '64px minmax(0,0.9fr) minmax(0,1.3fr) 120px minmax(0,1fr) 64px'
const hm = (t: string | null) => (t ? t.slice(0, 5) : '')

/** 매장 관리 (시안 AdminStores). 목록에서 고르면 오른쪽에 정보, 등록·수정은 별도 화면 */
export default function AdminStoresPage() {
  const [input, setInput] = useState('')
  const [keyword, setKeyword] = useState('')
  const [status, setStatus] = useState<StoreStatusFilter>('ALL')
  const [page, setPage] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)

  useEffect(() => {
    const t = window.setTimeout(() => {
      setKeyword(input.trim())
      setPage(0)
    }, 300)
    return () => window.clearTimeout(t)
  }, [input])

  const query = { keyword: keyword || undefined, status, page, size: 20 }
  const list = useQuery({ queryKey: ['admin', 'stores', query], queryFn: () => adminStoreApi.list(query), placeholderData: keepPreviousData })

  return (
    <>
      <PageHeader
        title="매장 관리"
        desc="상담과 지도에 나오는 매장이에요. 폐점한 매장은 사용자 화면에서 빠져요."
        actions={
          <Link to="/admin/stores/new" className={primaryBtn}>
            <Plus size={18} aria-hidden />
            매장 등록
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
            placeholder="매장 이름이나 주소로 검색"
            maxLength={100}
            className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-muted"
          />
        </label>
        <FilterSelect label="상태" value={status} options={STATUSES} onChange={(v) => (setStatus(v), setPage(0))} />
      </div>
      <div className="flex items-start gap-5">
        <Card className="min-w-0 flex-1">
          <TableHead cols={COLS}>
            <span>번호</span>
            <span>매장 이름</span>
            <span>주소</span>
            <span>전화</span>
            <span>취급 업무</span>
            <span>상태</span>
          </TableHead>
          {list.isPending && <Empty>불러오는 중…</Empty>}
          {list.isError && <Empty>목록을 불러오지 못했어요.</Empty>}
          {list.data?.stores.length === 0 && <Empty>조건에 맞는 매장이 없어요.</Empty>}
          {list.data?.stores.map((s) => (
            <button
              key={s.storeId}
              type="button"
              aria-pressed={selected === s.storeId}
              onClick={() => setSelected(selected === s.storeId ? null : s.storeId)}
              className={`grid min-h-14 w-full items-center gap-x-4 border-t border-line px-5 py-2 text-left text-sm hover:bg-surface-2 ${
                selected === s.storeId ? 'bg-surface-2' : ''
              }`}
              style={{ gridTemplateColumns: COLS }}
            >
              <span className="text-ink-muted">#{s.storeId}</span>
              <span className="truncate font-semibold">{s.name}</span>
              <span className="truncate text-ink-sub">{s.address}</span>
              <span className="text-ink-sub">{s.phone || '—'}</span>
              <span className="flex flex-wrap gap-1">
                {s.services.map((sv) => (
                  <Badge key={sv.code} tone="brand">{sv.name}</Badge>
                ))}
              </span>
              <span>{s.status === 'OPEN' ? <Badge tone="success">영업</Badge> : <Badge tone="muted">폐점</Badge>}</span>
            </button>
          ))}
          {list.data && list.data.totalElements > 0 && (
            <Pager page={page} totalPages={list.data.totalPages} total={list.data.totalElements} unit="곳" onPage={setPage} />
          )}
        </Card>
        {selected != null && <StoreDetail id={selected} onClose={() => setSelected(null)} />}
      </div>
    </>
  )
}

function StoreDetail({ id, onClose }: { id: number; onClose: () => void }) {
  const { data, isPending } = useQuery({ queryKey: ['admin', 'store', id], queryFn: () => adminStoreApi.get(id) })
  return (
    <Card className="sticky top-7 w-[320px] shrink-0 p-5 text-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[15px] font-extrabold">매장 정보</h2>
        <button type="button" aria-label="닫기" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-sub">
          <X size={18} aria-hidden />
        </button>
      </div>
      {isPending || !data ? (
        <p className="text-ink-sub">{isPending ? '불러오는 중…' : '불러오지 못했어요.'}</p>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-base font-bold">{data.name}</p>
          <dl className="grid grid-cols-[64px_1fr] gap-y-1.5">
            <dt className="text-ink-muted">주소</dt>
            <dd>{data.address}</dd>
            <dt className="text-ink-muted">전화</dt>
            <dd>{data.phone || '—'}</dd>
            <dt className="text-ink-muted">지역 코드</dt>
            <dd>{data.regionCode || '—'}</dd>
            <dt className="text-ink-muted">좌표</dt>
            <dd>
              {data.latitude}, {data.longitude}
            </dd>
          </dl>
          <div>
            <h3 className="mb-1.5 text-xs font-bold text-ink-muted">영업시간</h3>
            <ul className="rounded-xl bg-surface-2 px-3 py-1">
              {data.hours.map((h) => (
                <li key={h.dayOfWeek} className="flex justify-between py-1">
                  <span>{DAY[h.dayOfWeek] ?? h.dayOfWeek}</span>
                  <span className={h.closed ? 'text-ink-muted' : ''}>{h.closed ? '휴무' : `${hm(h.openTime)} – ${hm(h.closeTime)}`}</span>
                </li>
              ))}
            </ul>
          </div>
          <Link to={`/admin/stores/${data.storeId}`} className={secondaryBtn}>
            {data.status === 'CLOSED_DOWN' ? '자세히 보기' : '수정하기'}
          </Link>
        </div>
      )}
    </Card>
  )
}
