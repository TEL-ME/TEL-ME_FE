import * as Sentry from '@sentry/react'
import { useEffect } from 'react'
import { isRouteErrorResponse, useRouteError } from 'react-router-dom'
import mudoThinking from '../assets/mudo/mudo-thinking.png'

/** 화면을 그리다 오류가 났을 때 보이는 안내. 새로 불러오거나 처음 화면으로 간다 */
export function ErrorScreen() {
  return (
    <main role="alert" className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-bg px-6 text-center">
      <img src={mudoThinking} alt="" className="h-24 w-24 object-contain" />
      <h1 className="text-xl font-extrabold tracking-[-0.3px]">화면을 불러오지 못했어요</h1>
      <p className="text-[15px] leading-[23px] text-ink-sub">
        잠시 문제가 생겼어요.
        <br />
        다시 불러오거나 처음 화면으로 돌아가 주세요.
      </p>
      <div className="mt-3 flex w-full max-w-[320px] gap-2">
        <button
          type="button"
          onClick={() => window.location.assign('/')}
          className="min-h-[52px] flex-1 rounded-2xl border border-line bg-surface text-base font-bold text-ink"
        >
          처음으로
        </button>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="min-h-[52px] flex-1 rounded-2xl bg-inverse text-base font-bold text-inverse-ink"
        >
          다시 불러오기
        </button>
      </div>
    </main>
  )
}

/**
 * 라우터 errorElement. react-router는 화면 오류를 자체 경계에서 잡아 전역 오류로 올리지 않으므로 여기서 Sentry로 보낸다
 * (라우터가 만든 404 같은 응답 오류는 보내지 않는다)
 */
export function RouteErrorScreen() {
  const error = useRouteError()
  useEffect(() => {
    if (isRouteErrorResponse(error)) return
    Sentry.captureException(error, { tags: { boundary: 'router' } })
  }, [error])
  return <ErrorScreen />
}
