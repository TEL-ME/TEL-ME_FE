import { afterEach, describe, expect, it, vi } from 'vitest'
import { chatApi } from './chat'

const SENT = { sessionId: 1, messageId: 10, sequenceNo: 1, executionId: 5, executionStatus: 'RUNNING', createdAt: '2026-10-06T09:00:00Z' }

function stubFetch() {
  const fetchMock = vi.fn<typeof fetch>(
    async () => new Response(JSON.stringify({ isSuccess: true, code: '200', message: 'OK', result: SENT }), { status: 200 }),
  )
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

const bodyOf = (fetchMock: ReturnType<typeof stubFetch>) => JSON.parse(String(fetchMock.mock.calls[0][1]?.body))

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('chatApi.sendMessage', () => {
  it('평소에는 질문만 보낸다', async () => {
    const fetchMock = stubFetch()
    await chatApi.sendMessage(1, '유심 분실했어요')
    expect(bodyOf(fetchMock)).toEqual({ content: '유심 분실했어요' })
  })

  it('현재 위치를 쓰기로 했을 때만 위도·경도를 함께 보낸다', async () => {
    const fetchMock = stubFetch()
    await chatApi.sendMessage(1, '현재 위치에서 가까운 매장을 찾아줘', { latitude: 37.4979, longitude: 127.0276 })
    expect(bodyOf(fetchMock)).toEqual({ content: '현재 위치에서 가까운 매장을 찾아줘', latitude: 37.4979, longitude: 127.0276 })
  })
})
