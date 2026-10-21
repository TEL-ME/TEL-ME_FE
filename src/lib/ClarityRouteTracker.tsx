import { useLayoutEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { initClarity, stopClarity } from './clarity'

/** 기존 온보딩 화면은 바꾸지 않고, 화면이 반영된 뒤 수집 가능 여부만 연결한다. */
export default function ClarityRouteTracker() {
    const location = useLocation()

    // 관리자 화면의 DOM이 남아 있는 동안 재개하지 않도록 이동한 화면의 렌더링 후 초기화한다.
    useLayoutEffect(() => {
        initClarity()
        return stopClarity
    }, [location])

    return <Outlet />
}
