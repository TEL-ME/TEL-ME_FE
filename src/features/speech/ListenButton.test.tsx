import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useToastStore } from '../../stores/toastStore'
import ListenButton from './ListenButton'
import { stopSpeech } from './speechPlayer'

const mp3 = () => new Response(new Blob(['x'], { type: 'audio/mpeg' }), { status: 200, headers: { 'Content-Type': 'audio/mpeg' } })

beforeEach(() => {
  // jsdom에는 없다
  URL.createObjectURL = vi.fn(() => 'blob:speech')
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined)
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {})
})

afterEach(() => {
  act(() => stopSpeech())
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('ListenButton', () => {
  it('누르면 음성을 받아 재생하고, 다시 누르면 멈춘다', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => mp3()))
    render(<ListenButton messageId={11} />)
    fireEvent.click(screen.getByRole('button', { name: '답변 듣기' }))
    expect(await screen.findByRole('button', { name: '듣기 멈추기' })).toBeInTheDocument()
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/v1/chat/messages/11/speech'), expect.anything())
    fireEvent.click(screen.getByRole('button', { name: '듣기 멈추기' }))
    expect(screen.getByRole('button', { name: '답변 듣기' })).toBeInTheDocument()
  })

  it('한 번에 하나만 재생한다', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => mp3()))
    render(
      <>
        <ListenButton messageId={21} />
        <ListenButton messageId={22} />
      </>,
    )
    const [first, second] = screen.getAllByRole('button', { name: '답변 듣기' })
    fireEvent.click(first)
    await screen.findByRole('button', { name: '듣기 멈추기' })
    fireEvent.click(second)
    await waitFor(() => expect(screen.getAllByRole('button', { name: '답변 듣기' })).toHaveLength(1))
    expect(screen.getAllByRole('button', { name: '듣기 멈추기' })).toHaveLength(1)
  })

  it('하루 한도를 넘으면 알린다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(JSON.stringify({ isSuccess: false, code: 'SPEECH429-1', message: 'x', result: null }), {
          status: 429,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    )
    render(<ListenButton messageId={31} />)
    fireEvent.click(screen.getByRole('button', { name: '답변 듣기' }))
    await waitFor(() => expect(useToastStore.getState().message).toBe('오늘 쓸 수 있는 음성 듣기를 모두 썼어요'))
    expect(screen.getByRole('button', { name: '답변 듣기' })).toBeInTheDocument()
  })
})
