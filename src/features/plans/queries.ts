import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { planApi, subscriptionApi, usageApi, type PlanFilter } from '../../api/plans'
import { queryClient } from '../../lib/queryClient'
import { useMe } from '../auth/useAuth'

/** 가입·사용량은 계정마다 다르므로 키에 사용자 번호를 넣는다 (로그아웃·다른 계정 로그인 시 섞이지 않게) */
export const subscriptionKey = (userId: number | null) => ['subscription', 'me', userId] as const
export const usageKey = (userId: number | null, month: string | null) => ['usage', 'me', userId, month] as const

export function usePlans(filter: PlanFilter) {
  return useQuery({
    queryKey: ['plans', filter.networkType ?? null, filter.targetGroup ?? null],
    queryFn: ({ signal }) => planApi.list(filter, signal),
    staleTime: 5 * 60_000,
    placeholderData: keepPreviousData,
  })
}

/** 판매 중인 전체 요금제. 채팅의 요금제 링크에서 이름으로 요금제를 찾을 때만 읽는다 (usePlans와 같은 캐시) */
export function useAllPlans(enabled: boolean) {
  return useQuery({
    queryKey: ['plans', null, null],
    queryFn: ({ signal }) => planApi.list({}, signal),
    staleTime: 5 * 60_000,
    enabled,
  })
}

/** 내 가입 정보. 로그인 회원만 (게스트는 401) */
export function useSubscription() {
  const { me, isUser } = useMe()
  return useQuery({
    queryKey: subscriptionKey(me.userId),
    queryFn: subscriptionApi.me,
    enabled: isUser,
  })
}

/** 사용량. month(yyyy-MM)가 null이면 이번 달 */
export function useUsage(month: string | null) {
  const { me, isUser } = useMe()
  return useQuery({
    queryKey: usageKey(me.userId, month),
    queryFn: ({ signal }) => usageApi.me(month ?? undefined, signal),
    enabled: isUser,
    placeholderData: keepPreviousData,
  })
}

/** 가입·변경·해지·정지 뒤: 가입 정보와 사용량(예상 요금·정지 표시)을 다시 읽는다 */
export async function refreshSubscription() {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['subscription'] }),
    queryClient.invalidateQueries({ queryKey: ['usage'] }),
  ])
}
