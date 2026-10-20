import type { ErrorEvent } from '@sentry/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const sentry = vi.hoisted(() => ({
  captureException: vi.fn(),
  scope: { setTags: vi.fn(), setFingerprint: vi.fn() },
}))
vi.mock('@sentry/react', () => ({
  captureException: sentry.captureException,
  withScope: (fn: (scope: typeof sentry.scope) => void) => fn(sentry.scope),
}))

import { api, ApiError } from '../api/client'
import { normalizePath, reportServerError, scrubBreadcrumb, scrubEvent } from './sentry'

function respond(status: number, body: unknown) {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(body), { status })))
}

beforeEach(() => vi.clearAllMocks())
afterEach(() => vi.unstubAllGlobals())

describe('API 오류 수집', () => {
  it('5xx는 경로·상태만 담아 한 건 보낸다 (숫자 ID는 :id, 쿼리 제외)', async () => {
    respond(500, { isSuccess: false, code: 'COMMON500', message: '서버 오류' })
    await expect(api('/api/v1/chat/sessions/42/messages', { method: 'POST', body: { content: '번호 900101-1000000' } }))
      .rejects.toBeInstanceOf(ApiError)
    expect(sentry.captureException).toHaveBeenCalledTimes(1)
    const error = sentry.captureException.mock.calls[0][0] as Error
    expect(error.name).toBe('ApiServerError')
    expect(error.message).toBe('POST /api/v1/chat/sessions/:id/messages → 500')
    expect(JSON.stringify(sentry.scope.setTags.mock.calls)).not.toContain('900101')
    expect(sentry.scope.setTags).toHaveBeenCalledWith(expect.objectContaining({ 'api.status': '500', 'api.code': 'COMMON500' }))
  })

  it('4xx는 보내지 않는다', async () => {
    respond(401, { isSuccess: false, code: 'AUTH401', message: '로그인이 필요해요' })
    await expect(api('/api/v1/auth/me')).rejects.toBeInstanceOf(ApiError)
    respond(404, { isSuccess: false, code: 'CHAT404-1', message: '없음' })
    await expect(api('/api/v1/chat/sessions/1')).rejects.toBeInstanceOf(ApiError)
    expect(sentry.captureException).not.toHaveBeenCalled()
  })

  it('reportServerError는 500 미만이면 무시한다', () => {
    reportServerError('GET', '/api/v1/x', 499)
    expect(sentry.captureException).not.toHaveBeenCalled()
  })

  it('경로 정리', () => {
    expect(normalizePath('/api/v1/stores/12?keyword=강남')).toBe('/api/v1/stores/:id')
  })
})

describe('보내기 전 정리', () => {
  it('처리 안 된 ApiError(4xx·5xx)는 버린다', () => {
    const event = { exception: {} } as ErrorEvent
    expect(scrubEvent(event, { originalException: new ApiError(400, 'X', 'bad') })).toBeNull()
    expect(scrubEvent(event, { originalException: new ApiError(503, 'X', 'down') })).toBeNull()
    expect(scrubEvent(event, { originalException: new Error('render') })).toBe(event)
  })

  it('요청 본문·쿠키·쿼리·사용자 정보를 지운다', () => {
    const event = {
      request: {
        url: 'https://telme.app/faq?q=주민번호',
        data: { content: '채팅 내용' },
        cookies: { JSESSIONID: 'x' },
        query_string: 'q=주민번호',
        headers: { 'User-Agent': 'UA', Referer: 'https://telme.app/chat/1?x=1' },
      },
      user: { ip_address: '1.2.3.4' },
    } as unknown as ErrorEvent
    const out = scrubEvent(event)!
    expect(out.request).toEqual({ url: 'https://telme.app/faq', headers: { 'User-Agent': 'UA' } })
    expect(out.user).toBeUndefined()
  })

  it('콘솔·클릭 기록은 버리고, 요청 기록은 쿼리를 뺀다', () => {
    expect(scrubBreadcrumb({ category: 'console', message: '질문' })).toBeNull()
    expect(scrubBreadcrumb({ category: 'ui.click', message: 'button' })).toBeNull()
    expect(
      scrubBreadcrumb({ category: 'fetch', data: { url: '/api/v1/stores?keyword=강남', method: 'GET', status_code: 500 } })
        ?.data,
    ).toEqual({ url: '/api/v1/stores', method: 'GET', status_code: 500 })
  })
})
