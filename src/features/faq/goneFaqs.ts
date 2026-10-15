import { create } from 'zustand'

/** 열어 보니 숨김·삭제된 FAQ. 상담의 "참고한 정보"에서 흐리게 보여준다 (새로고침하면 초기화) */
export const useGoneFaqs = create<{ ids: number[] }>(() => ({ ids: [] }))

export function markFaqGone(faqId: number) {
  const { ids } = useGoneFaqs.getState()
  if (!ids.includes(faqId)) useGoneFaqs.setState({ ids: [...ids, faqId] })
}

export const GONE_FAQ_MESSAGE = '삭제된 질문이에요'
