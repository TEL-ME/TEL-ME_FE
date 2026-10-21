import { Search, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { FAQ_CATEGORIES, type FaqCategory } from '../api/faq'
import FaqItem from '../features/faq/FaqItem'
import { GONE_FAQ_MESSAGE, markFaqGone } from '../features/faq/goneFaqs'
import { isFaqGone, useFaqDetail, useFaqList } from '../features/faq/queries'
import { showToast } from '../stores/toastStore'
import { useDragScroll } from '../lib/useDragScroll'

const parseId = (v: string | null) => (v && /^\d+$/.test(v) ? Number(v) : null)

function CategoryChip({ on, onClick, children }: { on: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`h-[34px] shrink-0 whitespace-nowrap rounded-full px-3.5 text-[13px] ${
        on ? 'bg-inverse font-bold text-inverse-ink' : 'bg-surface font-medium text-ink-sub'
      }`}
    >
      {children}
    </button>
  )
}

/**
 * 자주 묻는 질문. 많이 참고한 순으로 20개씩 이어서 불러온다.
 * /faq?id=123: 상담의 "참고한 정보"에서 눌러 온 경우. 그 FAQ를 맨 위에 펼쳐 두고 카테고리도 맞춘다.
 */
export default function FaqPage() {
  // 카테고리 줄을 PC 마우스로도 끌어서 넘긴다
  const categoryDrag = useDragScroll<HTMLDivElement>()
  const [params, setParams] = useSearchParams()
  const pinnedId = parseId(params.get('id'))
  const detail = useFaqDetail(pinnedId)
  const pinned = pinnedId != null ? (detail.data ?? null) : null

  const [input, setInput] = useState('')
  const [keyword, setKeyword] = useState('')
  // undefined: 아직 고르지 않음 → 눌러 온 FAQ의 카테고리, 없으면 전체
  const [picked, setPicked] = useState<FaqCategory | null | undefined>(undefined)
  const category = picked !== undefined ? picked : (pinned?.category ?? null)
  const [openId, setOpenId] = useState<number | null>(pinnedId)
  const mainRef = useRef<HTMLElement>(null)

  // 눌러 온 FAQ를 다 받은 뒤 목록을 부른다 (전체 → 카테고리로 바뀌며 두 번 부르지 않게)
  const list = useFaqList(category, keyword, !(pinnedId != null && detail.isPending))
  const items = (list.data?.pages.flatMap((p) => p.faqs) ?? []).filter((f) => f.faqId !== pinned?.faqId)
  const total = list.data?.pages[0]?.totalElements ?? 0

  const unpin = () => {
    if (params.has('id')) setParams({}, { replace: true })
  }

  // 숨김·삭제된 FAQ로 들어오면 알리고 전체 목록을 보여준다
  useEffect(() => {
    if (pinnedId == null || !isFaqGone(detail.error)) return
    markFaqGone(pinnedId)
    showToast(GONE_FAQ_MESSAGE)
    setParams({}, { replace: true })
  }, [pinnedId, detail.error, setParams])

  // 입력이 멈추면 검색. 검색하면 눌러 온 FAQ 강조는 푼다
  useEffect(() => {
    const t = window.setTimeout(() => {
      const next = input.trim()
      setKeyword(next)
      mainRef.current?.scrollTo({ top: 0 })
      if (next) unpin()
    }, 300)
    return () => window.clearTimeout(t)
    // unpin은 params만 본다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input])

  const pickCategory = (c: FaqCategory | null) => {
    setPicked(c)
    unpin()
    mainRef.current?.scrollTo({ top: 0 })
  }

  // 목록 끝이 보이면 다음 페이지
  const sentinelRef = useRef<HTMLDivElement>(null)
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = list
  useEffect(() => {
    const el = sentinelRef.current
    if (!el || !hasNextPage || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isFetchingNextPage) void fetchNextPage()
      },
      { root: mainRef.current, rootMargin: '240px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const toggle = (id: number) => setOpenId((v) => (v === id ? null : id))
  const waiting = list.isPending || (pinnedId != null && detail.isPending)

  return (
    <main ref={mainRef} className="no-scrollbar mx-auto w-full max-w-[480px] flex-1 overflow-y-auto pb-6">
      <div className="sticky top-0 z-10 flex flex-col gap-3 bg-bg pb-3 pt-5">
        <h1 className="px-5 text-2xl font-extrabold tracking-tight">자주 묻는 질문</h1>
        <label className="mx-4 flex h-11 items-center gap-2 rounded-2xl bg-surface px-3.5 text-ink-muted focus-within:ring-[1.5px] focus-within:ring-brand">
          <Search size={18} strokeWidth={2} aria-hidden />
          <span className="sr-only">FAQ 검색</span>
          <input
            type="search"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="궁금한 내용을 검색해 보세요"
            maxLength={200}
            className="min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-muted [&::-webkit-search-cancel-button]:hidden"
          />
          {input && (
            <button type="button" aria-label="검색어 지우기" onClick={() => setInput('')} className="-mr-1 p-1">
              <X size={16} strokeWidth={2} aria-hidden />
            </button>
          )}
        </label>
        <div {...categoryDrag} role="group" aria-label="카테고리" className="no-scrollbar flex gap-1.5 overflow-x-auto px-4">
          <CategoryChip on={category === null} onClick={() => pickCategory(null)}>
            전체
          </CategoryChip>
          {FAQ_CATEGORIES.map(([k, label]) => (
            <CategoryChip key={k} on={category === k} onClick={() => pickCategory(k)}>
              {label}
            </CategoryChip>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2 px-4">
        {!waiting && !list.isError && (
          <div className="flex items-center justify-between gap-3 px-1 text-[13px] text-ink-sub">
            <p aria-live="polite" className="min-w-0 truncate">
              {keyword ? `'${keyword}' 검색 결과 ${total}개` : `${total}개`}
            </p>
            {/* 서버 정렬이 자주 묻는 순(POPULAR)만 쓰여 표시만 한다 */}
            <span className="shrink-0">자주 묻는 순</span>
          </div>
        )}
        <ul className="flex flex-col gap-2">
          {pinned && <FaqItem faq={pinned} pinned open={openId === pinned.faqId} onToggle={() => toggle(pinned.faqId)} />}
          {items.map((f) => (
            <FaqItem key={f.faqId} faq={f} open={openId === f.faqId} onToggle={() => toggle(f.faqId)} />
          ))}
        </ul>
        {waiting && <p className="py-10 text-center text-sm text-ink-muted">불러오는 중…</p>}
        {list.isError && (
          <div className="flex flex-col items-center gap-3 py-10 text-sm text-ink-sub">
            FAQ를 불러오지 못했어요.
            <button type="button" onClick={() => void list.refetch()} className="rounded-full bg-surface px-4 py-2 font-semibold text-ink">
              다시 시도
            </button>
          </div>
        )}
        {!waiting && !list.isError && total === 0 && !pinned && (
          <p className="py-10 text-center text-sm text-ink-muted">
            {keyword ? '검색 결과가 없어요. 다른 말로 찾아보세요.' : '등록된 질문이 없어요.'}
          </p>
        )}
        <div ref={sentinelRef} aria-hidden className="h-px" />
        {isFetchingNextPage && <p className="py-4 text-center text-[13px] text-ink-muted">더 불러오는 중…</p>}
      </div>
    </main>
  )
}
