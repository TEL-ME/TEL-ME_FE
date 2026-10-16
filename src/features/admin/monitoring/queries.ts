import { useQuery } from '@tanstack/react-query'
import { useCallback, useMemo, useState } from 'react'
import { adminMonitoringApi, type MonitoringListItem, type MonitoringStatus } from '../../../api/adminMonitoring'

/** 실시간 갱신 간격 (BE 안내: 2~3초) */
export const POLL_MS = 3_000
const PAGE_SIZE = 30

/**
 * 처리 흐름 목록.
 * - 최신 페이지는 live가 켜져 있으면 3초마다 beforeId 없이 다시 읽어 통째로 바꾼다 (진행 중 행의 칸·시간도 이때 갱신)
 * - "더 보기"로 읽은 과거 페이지는 한 번만 읽고 아래에 붙인다
 */
export function useMonitoringList(status: MonitoringStatus | null, live: boolean) {
  const latest = useQuery({
    queryKey: ['admin', 'monitoring', 'list', status],
    queryFn: ({ signal }) => adminMonitoringApi.list({ size: PAGE_SIZE, status: status ?? undefined }, signal),
    refetchInterval: live ? POLL_MS : false,
    refetchIntervalInBackground: false,
  })

  // 과거 페이지. 어느 필터에서 읽었는지 함께 두고, 필터가 바뀌면 쓰지 않는다
  const [olderState, setOlder] = useState<{ status: MonitoringStatus | null; items: MonitoringListItem[]; next: number | null } | null>(null)
  const older = olderState?.status === status ? olderState : null
  const [loadingMore, setLoadingMore] = useState(false)
  const [moreErrorState, setMoreError] = useState<{ status: MonitoringStatus | null; error: unknown } | null>(null)
  const moreError = moreErrorState?.status === status ? moreErrorState.error : null

  const latestItems = latest.data?.items
  const items = useMemo(() => {
    const top = latestItems ?? []
    if (!older) return top
    // 최신 페이지가 밀려 내려가도 빈틈이 없게: 최신 페이지 + (그보다 오래된) 과거 페이지
    const seen = new Set(top.map((r) => r.messageId))
    return [...top, ...older.items.filter((r) => !seen.has(r.messageId))]
  }, [latestItems, older])

  const nextBeforeId = older ? older.next : (latest.data?.nextBeforeId ?? null)

  const loadMore = useCallback(async () => {
    if (nextBeforeId == null || loadingMore) return
    setLoadingMore(true)
    setMoreError(null)
    try {
      const page = await adminMonitoringApi.list({ beforeId: nextBeforeId, size: PAGE_SIZE, status: status ?? undefined })
      setOlder((prev) => ({
        status,
        items: [...(prev?.status === status ? prev.items : []), ...page.items],
        next: page.nextBeforeId,
      }))
    } catch (e) {
      setMoreError({ status, error: e })
    } finally {
      setLoadingMore(false)
    }
  }, [nextBeforeId, loadingMore, status])

  return { latest, items, hasMore: nextBeforeId != null, loadMore, loadingMore, moreError }
}

/** 실행 상세. 진행 중이면 3초마다 다시 읽고(타임라인이 늘어난다), 끝나면 멈춘다 */
export function useMonitoringDetail(executionId: number | null) {
  return useQuery({
    queryKey: ['admin', 'monitoring', 'detail', executionId],
    queryFn: ({ signal }) => adminMonitoringApi.detail(executionId!, signal),
    enabled: executionId != null,
    refetchInterval: (q) => (q.state.data?.status === 'RUNNING' ? POLL_MS : false),
  })
}
