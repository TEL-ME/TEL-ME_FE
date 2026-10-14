import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ChatEndSummary } from '../../../api/types'
import { pollDelay } from '../endSummaryQueries'

const getSummary = vi.fn<(sessionId: number) => Promise<ChatEndSummary>>()
vi.mock('../../../api/chat', () => ({ chatApi: { getSummary: (id: number) => getSummary(id) } }))

const { default: EndSummaryCard } = await import('./EndSummaryCard')

const res = (patch: Partial<ChatEndSummary>): ChatEndSummary => ({
  sessionId: 1,
  sessionStatus: 'CLOSED',
  summaryStatus: 'PENDING',
  summary: null,
  generatedAt: null,
  message: null,
  ...patch,
})

const show = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <EndSummaryCard sessionId={1} />
    </QueryClientProvider>,
  )

/** 가짜 시계에서 조회 응답(약속)을 처리한다 */
const flush = () =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(50)
  })

describe('pollDelay', () => {
  it('처음 10초는 2초, 그 뒤로는 5초, 2분이 지나면 멈춘다', () => {
    expect(pollDelay(0)).toBe(2_000)
    expect(pollDelay(9_999)).toBe(2_000)
    expect(pollDelay(10_000)).toBe(5_000)
    expect(pollDelay(119_999)).toBe(5_000)
    expect(pollDelay(120_000)).toBe(false)
  })
})

describe('EndSummaryCard', () => {
  beforeEach(() => {
    getSummary.mockReset()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('완료되면 주요 문의·안내받은 내용·남은 사항을 보여 주고, 안내 앞의 "안내받은 내용:"은 뗀다', async () => {
    const pendingItems = Array.from({ length: 10 }, (_, i) => `확인할 사항 ${i + 1}`)
    getSummary.mockResolvedValue(
      res({
        summaryStatus: 'COMPLETED',
        generatedAt: new Date().toISOString(),
        summary: {
          topics: ['유심 분실 시 재발급 방법'],
          guidance: ['안내받은 내용: 가까운 매장에서 신분증을 지참하면 재발급할 수 있어요.'],
          pendingItems,
        },
      }),
    )
    show()
    expect(await screen.findByText('유심 분실 시 재발급 방법')).toBeInTheDocument()
    expect(screen.getByText('주요 문의')).toBeInTheDocument()
    expect(screen.getByText('가까운 매장에서 신분증을 지참하면 재발급할 수 있어요.')).toBeInTheDocument()
    expect(screen.queryByText(/^안내받은 내용:/)).not.toBeInTheDocument()
    // 남은 사항은 개수 상한 없이 모두 보여 준다
    expect(screen.getByText('남은 사항')).toBeInTheDocument()
    expect(screen.getByText('확인할 사항 10')).toBeInTheDocument()
    expect(screen.getByText(/오늘 .* 정리/)).toBeInTheDocument()
  })

  it('남은 사항이 없으면 그 칸을 그리지 않는다 ("모두 해결됨"으로 단정하지 않는다)', async () => {
    getSummary.mockResolvedValue(
      res({ summaryStatus: 'COMPLETED', generatedAt: null, summary: { topics: ['요금제 변경'], guidance: [], pendingItems: [] } }),
    )
    show()
    expect(await screen.findByText('요금제 변경')).toBeInTheDocument()
    expect(screen.queryByText('남은 사항')).not.toBeInTheDocument()
    expect(screen.queryByText(/해결/)).not.toBeInTheDocument()
  })

  it('준비 중이면 정리 중으로 보이고, 다시 읽어서 완료되면 결과로 바뀐다', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: false })
    getSummary
      .mockResolvedValueOnce(res({ summaryStatus: 'PENDING' }))
      .mockResolvedValueOnce(res({ summaryStatus: 'GENERATING' }))
      .mockResolvedValue(res({ summaryStatus: 'COMPLETED', summary: { topics: ['번호이동'], guidance: [], pendingItems: [] } }))
    show()
    await flush()
    expect(screen.getByText('무러바라가 상담 내용을 정리하고 있어요')).toBeInTheDocument()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_000)
    })
    expect(getSummary).toHaveBeenCalledTimes(2)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_000)
    })
    await flush()
    expect(screen.getByText('번호이동')).toBeInTheDocument()
    // 완료 뒤에는 더 읽지 않는다
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000)
    })
    expect(getSummary).toHaveBeenCalledTimes(3)
  })

  it('2분이 지나도 준비 중이면 자동 조회를 멈추고 "다시 확인"으로 한 번 더 읽는다', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: false })
    getSummary.mockResolvedValue(res({ summaryStatus: 'PENDING' }))
    show()
    await flush()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(130_000)
    })
    expect(screen.getByText(/요약이 아직 준비되지 않았어요/)).toBeInTheDocument()
    const calls = getSummary.mock.calls.length
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000)
    })
    expect(getSummary).toHaveBeenCalledTimes(calls)

    fireEvent.click(screen.getByRole('button', { name: '다시 확인' }))
    await flush()
    expect(getSummary).toHaveBeenCalledTimes(calls + 1)
  })

  it('빈 상담·실패·요청 없음을 구분한다', async () => {
    getSummary.mockResolvedValueOnce(res({ summaryStatus: 'EMPTY' }))
    const empty = show()
    expect(await screen.findByText('요약할 상담 내용이 없어요.')).toBeInTheDocument()
    empty.unmount()

    getSummary.mockResolvedValueOnce(res({ summaryStatus: 'FAILED' }))
    const failed = show()
    expect(await screen.findByText(/상담 요약을 만들지 못했어요/)).toBeInTheDocument()
    failed.unmount()

    getSummary.mockResolvedValueOnce(res({ summaryStatus: 'NOT_REQUESTED' }))
    const { container } = show()
    await vi.waitFor(() => expect(getSummary).toHaveBeenCalledTimes(3))
    await vi.waitFor(() => expect(container).toBeEmptyDOMElement())
  })

  it('조회 자체가 실패하면 요약 실패로 단정하지 않고 다시 불러오게 한다', async () => {
    getSummary.mockRejectedValueOnce(new Error('offline')).mockResolvedValue(res({ summaryStatus: 'EMPTY' }))
    show()
    expect(await screen.findByText(/요약을 불러오지 못했어요/)).toBeInTheDocument()
    expect(screen.queryByText(/만들지 못했어요/)).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '다시 불러오기' }))
    expect(await screen.findByText('요약할 상담 내용이 없어요.')).toBeInTheDocument()
  })
})
