import { useCallback, useEffect, useLayoutEffect } from 'react'
import { createPath, Outlet, useBlocker, useLocation, type BlockerFunction } from 'react-router-dom'
import { canRecordClarity, initClarity, isClarityRestartPending, stopClarity } from './clarity'

const RESTART_CHECK_INTERVAL_MS = 20
const RESTART_WAIT_LIMIT_MS = 1000

/** 기존 온보딩 화면은 바꾸지 않고, 화면이 반영된 뒤 수집 가능 여부만 연결한다. */
export default function ClarityRouteTracker() {
  const { pathname } = useLocation()
  const recordable = canRecordClarity(pathname)

  const beforeNavigation = useCallback<BlockerFunction>(({ currentLocation, nextLocation }) => {
    // SDK가 주소 변경 직후 예약하는 재시작을 막되, 고객 화면끼리의 수집은 유지한다.
    if (canRecordClarity(currentLocation.pathname) && !canRecordClarity(nextLocation.pathname)) {
      // 이미 예약된 SDK 재시작은 stop으로 취소되지 않아 고객 화면에서 먼저 끝나게 한다.
      if (isClarityRestartPending()) return true
      stopClarity()
    }
    return false
  }, [])
  const blocker = useBlocker(beforeNavigation)

  useEffect(() => {
    if (blocker.state !== 'blocked') return
    const deadline = Date.now() + RESTART_WAIT_LIMIT_MS
    let timer: ReturnType<typeof setTimeout>
    const finishNavigation = () => {
      if (!isClarityRestartPending()) {
        stopClarity()
        blocker.proceed()
      } else if (Date.now() >= deadline) {
        // SDK가 응답하지 않아도 이동을 막지 않고, 새 문서에서 제외 경로를 연다.
        // 기존 문서의 예약 작업이 관리자 화면에서 실행되지 않도록 전체 이동한다.
        stopClarity()
        window.location.assign(createPath(blocker.location))
      } else {
        timer = setTimeout(finishNavigation, RESTART_CHECK_INTERVAL_MS)
      }
    }
    finishNavigation()
    return () => clearTimeout(timer)
  }, [blocker])

  // 관리자 화면의 DOM이 남아 있는 동안 재개하지 않도록 이동한 화면의 렌더링 후 초기화한다.
  useLayoutEffect(() => {
    if (recordable) initClarity()
    else stopClarity()
    return stopClarity
  }, [recordable])

  return <Outlet />
}
