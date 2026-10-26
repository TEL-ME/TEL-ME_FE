import * as Sentry from '@sentry/react'
import type { Breadcrumb, ErrorEvent } from '@sentry/react'

/**
 * Sentry 오류 수집
 * - 수집: 화면 오류(렌더링·전역 오류) + API 5xx 응답. 4xx는 정상 흐름이라 보내지 않는다
 * - 끔: 세션 리플레이, 성능 측정(tracing)
 * - 개인정보: sendDefaultPii false, 요청 본문·쿠키·쿼리스트링·콘솔·클릭 기록을 보내지 않는다 (채팅 내용이 섞이지 않게)
 * VITE_SENTRY_DSN이 비어 있으면 아무것도 하지 않는다
 */
export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN?.trim()
  if (!dsn) return
  Sentry.init({
    dsn,
    environment: import.meta.env.VITE_SENTRY_ENVIRONMENT?.trim() || 'local',
    sendDefaultPii: false,
    // 성능 측정·리플레이는 쓰지 않는다 (tracesSampleRate·replay 통합을 넣지 않음)
    integrations: [Sentry.breadcrumbsIntegration({ console: false, dom: false })],
    beforeSend: scrubEvent,
    beforeBreadcrumb: scrubBreadcrumb,
  })
}

/** API가 500번대로 응답했을 때 한 건 보낸다. 같은 API·상태끼리 묶이도록 경로의 숫자 ID는 :id로 바꾼다 */
/**
 * 5xx지만 장애가 아니라 운영 상태를 알리는 응답. 오류로 쌓이면 진짜 장애를 가리므로 보내지 않는다
 * - STORE503-3: 운영자가 길찾기를 꺼 둠 · STORE503-4: 이동 수단의 하루 호출 예산 소진
 */
const EXPECTED_5XX_CODES = new Set(['STORE503-3', 'STORE503-4'])

export function reportServerError(method: string, path: string, status: number, code?: string) {
  if (status < 500) return
  if (code && EXPECTED_5XX_CODES.has(code)) return
  const route = normalizePath(path)
  const error = new Error(`${method} ${route} → ${status}`)
  error.name = 'ApiServerError'
  Sentry.withScope((scope) => {
    scope.setTags({ 'api.method': method, 'api.route': route, 'api.status': String(status), 'api.code': code ?? '' })
    scope.setFingerprint(['api-5xx', method, route, String(status)])
    Sentry.captureException(error)
  })
}

export function normalizePath(path: string) {
  return stripQuery(path)
    .split('/')
    .map((part) => (/^\d+$/.test(part) || /^[0-9a-f-]{16,}$/i.test(part) ? ':id' : part))
    .join('/')
}

function stripQuery(url: string) {
  return url.split(/[?#]/)[0]
}

/** 보내기 직전 정리. 처리 안 된 ApiError는 버린다 (4xx는 수집 대상이 아니고, 5xx는 reportServerError로 이미 보냄) */
export function scrubEvent(event: ErrorEvent, hint?: { originalException?: unknown }): ErrorEvent | null {
  const original = hint?.originalException
  if (original instanceof Error && original.name === 'ApiError') return null
  if (event.request) {
    delete event.request.data
    delete event.request.cookies
    delete event.request.query_string
    if (event.request.url) event.request.url = stripQuery(event.request.url)
    if (event.request.headers) {
      const { 'User-Agent': ua } = event.request.headers
      event.request.headers = ua ? { 'User-Agent': ua } : {}
    }
  }
  delete event.user
  return event
}

export function scrubBreadcrumb(crumb: Breadcrumb): Breadcrumb | null {
  // 콘솔·클릭·입력 기록에는 질문 내용이 섞일 수 있어 버린다
  if (crumb.category === 'console' || crumb.category?.startsWith('ui.')) return null
  if (crumb.data) {
    const data = { ...crumb.data }
    for (const key of ['url', 'from', 'to']) {
      if (typeof data[key] === 'string') data[key] = stripQuery(data[key] as string)
    }
    delete data.request_body_size
    delete data.response_body_size
    return { ...crumb, data }
  }
  return crumb
}
