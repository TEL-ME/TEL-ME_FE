import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { MonitoringDetail, MonitoringList, MonitoringListItem, Stages } from '../../api/adminMonitoring'
import { formatElapsed, kstTime, stageName, taskName, whoLabel } from '../../features/admin/monitoring/stages'

const list = vi.fn<(q: { beforeId?: number; size?: number; status?: string }) => Promise<MonitoringList>>()
const detail = vi.fn<(id: number) => Promise<MonitoringDetail>>()
vi.mock('../../api/adminMonitoring', () => ({
  adminMonitoringApi: { list: (q: never) => list(q), detail: (id: number) => detail(id) },
}))

const { default: AdminMonitoringPage } = await import('./AdminMonitoringPage')

const cell = (state: Stages['result']['state'], label: string | null = null) => ({ state, label })
const stages = (result = cell('PASSED', '근거 답변')): Stages => ({
  inputCheck: cell('PASSED'),
  routing: cell('PASSED', 'FAQ'),
  search: cell('PASSED', '3건'),
  judgment: cell('SKIPPED'),
  generation: cell('PASSED'),
  outputCheck: cell('PASSED'),
  result,
})

const row = (messageId: number, patch: Partial<MonitoringListItem> = {}): MonitoringListItem => ({
  messageId,
  executionId: messageId + 1000,
  sessionId: 1,
  userId: 2,
  userName: '운영자',
  guestId: null,
  status: 'COMPLETED',
  startedAt: '2026-10-16T01:55:52.750Z',
  endedAt: '2026-10-16T01:56:20.468Z',
  elapsedMs: 27_718,
  questionPreview: `질문 ${messageId}`,
  intent: 'FAQ',
  answerBasis: 'GROUNDED',
  errorCode: null,
  lastStage: 'finalTransmission',
  stages: stages(),
  ...patch,
})

const detailOf = (executionId: number, patch: Partial<MonitoringDetail> = {}): MonitoringDetail => ({
  executionId,
  sessionId: 1,
  inputMessageId: executionId - 1000,
  outputMessageId: null,
  userId: 2,
  userName: '운영자',
  guestId: null,
  status: 'COMPLETED',
  errorCode: null,
  startedAt: '2026-10-16T01:55:52.750Z',
  endedAt: '2026-10-16T01:56:20.468Z',
  elapsedMs: 27_718,
  answerBasis: 'GROUNDED',
  stages: stages(),
  originalUserMessage: '유심 재발급 비용 얼마예요?',
  finalAnswer: '7,700원이에요.',
  answerStatus: 'COMPLETED',
  inputCheckActions: [],
  timeline: [
    { stage: 'processing', at: null, elapsedMs: 40 },
    { stage: 'analysis', at: null, elapsedMs: 18_544 },
    { stage: 'finalTransmission', at: null, elapsedMs: 27_700 },
  ],
  traceRecorded: true,
  routing: [],
  modelAttempts: [
    {
      taskType: 'RAG_ANSWER',
      model: 'm',
      promptVersion: 'v1',
      contextCount: 2,
      status: 'SUCCESS',
      firstTokenMs: 900,
      totalMs: 4_700,
      createdAt: '2026-10-16T01:56:19.750Z',
    },
  ],
  steps: null,
  ...patch,
})

const show = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <AdminMonitoringPage />
    </QueryClientProvider>,
  )

/** 시간을 ms만큼 보내고, 받은 응답이 화면에 그려질 때까지 조금 더 보낸다 */
const flush = (ms = 0) =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
    await vi.advanceTimersByTimeAsync(50)
  })

describe('stages 표시 도우미', () => {
  it('UTC를 KST로, 시간을 읽기 쉽게, 모르는 이름은 그대로', () => {
    expect(kstTime('2026-10-16T01:55:52.750050Z')).toBe('10:55:52')
    expect(formatElapsed(850)).toBe('850ms')
    expect(formatElapsed(27_718)).toBe('27.7초')
    expect(formatElapsed(65_000)).toBe('1분 5초')
    expect(stageName('analysis')).toBe('분석·라우팅')
    expect(stageName('newStageFromBackend')).toBe('newStageFromBackend')
    expect(taskName('EVIDENCE_CHECK')).toBe('근거 판정')
    expect(taskName('NEW_TASK')).toBe('NEW_TASK')
    expect(whoLabel({ userId: null, userName: null, guestId: 'a3f9c210-77aa' })).toBe('게스트 a3f9c210')
  })
})

describe('AdminMonitoringPage', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: false })
    list.mockReset()
    detail.mockReset()
  })
  afterEach(() => vi.useRealTimers())

  it('3초마다 beforeId 없이 다시 읽어 표를 바꾸고, 진행 중 행의 시간이 늘어난다', async () => {
    const running = (ms: number) =>
      row(10, { status: 'RUNNING', endedAt: null, elapsedMs: ms, stages: stages(cell('RUNNING', '진행 중')) })
    list.mockResolvedValueOnce({ items: [running(3_000), row(9)], nextBeforeId: null })
    list.mockResolvedValueOnce({ items: [row(11), running(6_000), row(9)], nextBeforeId: null })
    show()
    await flush()
    expect(screen.getByText('3.0초')).toBeInTheDocument()
    expect(screen.queryByText('질문 11')).not.toBeInTheDocument()

    await flush(3_000)
    expect(list).toHaveBeenCalledTimes(2)
    expect(list.mock.calls[1][0].beforeId).toBeUndefined()
    expect(screen.getByText('질문 11')).toBeInTheDocument()
    expect(screen.getByText('6.0초')).toBeInTheDocument()
  })

  it('멈추기를 누르면 더 읽지 않는다', async () => {
    list.mockResolvedValue({ items: [row(9)], nextBeforeId: null })
    show()
    await flush()
    fireEvent.click(screen.getByRole('button', { name: '멈추기' }))
    await flush(9_000)
    expect(list).toHaveBeenCalledTimes(1)
  })

  it('상태 필터를 status로 보낸다', async () => {
    list.mockResolvedValue({ items: [row(9)], nextBeforeId: null })
    show()
    await flush()
    fireEvent.click(screen.getByRole('button', { name: '실패' }))
    await flush()
    expect(list).toHaveBeenLastCalledWith({ size: 30, status: 'FAILED' })
  })

  it('더 보기: nextBeforeId를 beforeId로 넘겨 아래에 붙이고, 끝이면 버튼을 숨긴다', async () => {
    list.mockImplementation(async (q) =>
      q.beforeId ? { items: [row(5), row(4)], nextBeforeId: null } : { items: [row(9), row(8)], nextBeforeId: 8 },
    )
    show()
    await flush()
    fireEvent.click(screen.getByRole('button', { name: '이전 기록 더 보기' }))
    await flush()
    expect(list).toHaveBeenLastCalledWith({ beforeId: 8, size: 30, status: undefined })
    expect(screen.getByText('질문 4')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '이전 기록 더 보기' })).not.toBeInTheDocument()

    // 실시간 갱신 뒤에도 과거 페이지는 남는다
    await flush(3_000)
    expect(screen.getByText('질문 4')).toBeInTheDocument()
  })

  it('차단 행은 상세를 열지 않는다', async () => {
    list.mockResolvedValue({
      items: [row(7, { status: 'BLOCKED', executionId: null, elapsedMs: null, stages: stages(cell('FAILED', '차단')) })],
      nextBeforeId: null,
    })
    show()
    await flush()
    const blocked = screen.getByRole('button', { name: /질문 7/ })
    expect(blocked).toBeDisabled()
    fireEvent.click(blocked)
    await flush()
    expect(detail).not.toHaveBeenCalled()
  })

  it('상세: 진행 중이면 3초마다 다시 읽고 끝나면 멈춘다', async () => {
    list.mockResolvedValue({ items: [row(9)], nextBeforeId: null })
    detail
      .mockResolvedValueOnce(detailOf(1009, { status: 'RUNNING', finalAnswer: null, timeline: [{ stage: 'processing', at: null, elapsedMs: 40 }] }))
      .mockResolvedValue(detailOf(1009))
    show()
    await flush()
    fireEvent.click(screen.getByRole('button', { name: /질문 9/ }))
    await flush()
    const panel = screen.getByRole('complementary', { name: '처리 상세' })
    expect(within(panel).getByText('아직 답변을 만들고 있어요')).toBeInTheDocument()
    await flush(3_000)
    expect(detail).toHaveBeenCalledTimes(2)
    expect(within(panel).getByText('7,700원이에요.')).toBeInTheDocument()
    // 분석에 걸린 시간 = 앞 기록 ~ analysis 기록
    expect(within(panel).getByText('분석·라우팅')).toBeInTheDocument()
    expect(within(panel).getByText('18.5초')).toBeInTheDocument()
    expect(within(panel).getByText('답변 생성')).toBeInTheDocument()
    await flush(9_000)
    expect(detail).toHaveBeenCalledTimes(2)
  })

  it('단계 기록이 없으면 "단계 시각 없음"', async () => {
    list.mockResolvedValue({ items: [row(9)], nextBeforeId: null })
    detail.mockResolvedValue(detailOf(1009, { timeline: [], modelAttempts: [] }))
    show()
    await flush()
    fireEvent.click(screen.getByRole('button', { name: /질문 9/ }))
    await flush()
    expect(screen.getByText(/단계 시각 없음/)).toBeInTheDocument()
  })
})
