import { useQuery } from '@tanstack/react-query'
import { chatApi } from '../../api/chat'
import type { EndSummaryStatus } from '../../api/types'

export const endSummaryKey = (sessionId: number) => ['chat', 'end-summary', sessionId] as const

/** 서버가 아직 요약을 만드는 중인 상태. 이때만 다시 조회한다 */
export const isPreparing = (status: EndSummaryStatus | undefined) => status === 'PENDING' || status === 'GENERATING'

/** 처음 10초는 2초마다, 그 뒤로는 5초마다 다시 읽고, 2분이 지나면 자동 조회를 멈춘다 (백엔드 안내 기준) */
const FAST_MS = 2_000
const FAST_FOR_MS = 10_000
const SLOW_MS = 5_000
export const GIVE_UP_MS = 120_000

/** 기다린 시간에 따라 다음 조회까지 쉴 시간. 멈출 때는 false */
export function pollDelay(elapsedMs: number): number | false {
  if (elapsedMs >= GIVE_UP_MS) return false
  return elapsedMs < FAST_FOR_MS ? FAST_MS : SLOW_MS
}

/** 화면에서 요약을 기다리기 시작한 시각 (대화별). 화면 대기를 멈춰도 서버 작업이 실패한 것은 아니다 */
const waitingSince = new Map<number, number>()

function startedWaiting(sessionId: number) {
  let since = waitingSince.get(sessionId)
  if (since == null) {
    since = Date.now()
    waitingSince.set(sessionId, since)
  }
  return since
}

/**
 * 종료된 대화의 요약. 새로고침 후에도 같은 API로 저장된 결과를 다시 읽는다.
 * - PENDING·GENERATING: 정해진 간격으로 다시 읽는다
 * - COMPLETED·EMPTY·FAILED·NOT_REQUESTED: 더 읽지 않는다
 */
export function useEndSummary(sessionId: number | null, enabled: boolean) {
  const query = useQuery({
    queryKey: endSummaryKey(sessionId ?? 0),
    queryFn: () => chatApi.getSummary(sessionId!),
    enabled: enabled && sessionId != null,
    // 끝난 결과는 바뀌지 않으므로 다시 읽지 않는다. 준비 중일 때만 아래 간격으로 읽는다
    staleTime: (q) => (isPreparing(q.state.data?.summaryStatus) ? 0 : Infinity),
    refetchOnWindowFocus: false,
    refetchInterval: (q) => {
      if (sessionId == null) return false
      if (!isPreparing(q.state.data?.summaryStatus)) {
        waitingSince.delete(sessionId)
        return false
      }
      return pollDelay(Date.now() - startedWaiting(sessionId))
    },
  })

  const status = query.data?.summaryStatus
  const since = sessionId != null ? waitingSince.get(sessionId) : undefined
  // 같은 결과가 와도 시간이 지났는지 다시 보도록 마지막으로 읽은 시각을 함께 쓴다
  const gaveUp = isPreparing(status) && since != null && query.dataUpdatedAt - since >= GIVE_UP_MS

  return { ...query, gaveUp }
}
