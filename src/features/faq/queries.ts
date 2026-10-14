import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { ApiError } from '../../api/client'
import { FAQ_GONE, faqApi, type FaqCategory } from '../../api/faq'

export const FAQ_PAGE_SIZE = 20

export const faqDetailKey = (faqId: number) => ['faq', 'detail', faqId] as const

/** 숨김·삭제된 FAQ (404 FAQ404-0) */
export const isFaqGone = (e: unknown) => e instanceof ApiError && (e.code === FAQ_GONE || e.status === 404)

/** FAQ 목록: 많이 참고한 순, 스크롤하면 다음 20개 */
export function useFaqList(category: FaqCategory | null, keyword: string, enabled = true) {
  return useInfiniteQuery({
    queryKey: ['faq', 'list', category, keyword],
    queryFn: ({ pageParam, signal }) =>
      faqApi.list(
        { category: category ?? undefined, keyword: keyword || undefined, sort: 'POPULAR', page: pageParam, size: FAQ_PAGE_SIZE },
        signal,
      ),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.page + 1 < last.totalPages ? last.page + 1 : undefined),
    placeholderData: keepPreviousData,
    enabled,
    staleTime: 60_000,
  })
}

/** FAQ 하나. 없어진 FAQ는 다시 시도하지 않는다 */
export function useFaqDetail(faqId: number | null) {
  return useQuery({
    queryKey: faqDetailKey(faqId ?? 0),
    queryFn: ({ signal }) => faqApi.detail(faqId!, signal),
    enabled: faqId != null,
    retry: (count, e) => !isFaqGone(e) && count < 2,
    staleTime: 60_000,
  })
}
