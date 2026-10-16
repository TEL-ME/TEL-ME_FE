import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import Composer from './Composer'

describe('Composer', () => {
  it('Enter로 보내고 입력창을 비운다', () => {
    const onSend = vi.fn()
    render(<Composer busy={false} onSend={onSend} />)
    const input = screen.getByLabelText('질문 입력')
    fireEvent.change(input, { target: { value: '유심 분실' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onSend).toHaveBeenCalledWith('유심 분실')
    expect(input).toHaveValue('')
  })

  it('한글 조합 중 Enter는 보내지 않는다', () => {
    const onSend = vi.fn()
    render(<Composer busy={false} onSend={onSend} />)
    const input = screen.getByLabelText('질문 입력')
    fireEvent.change(input, { target: { value: '유심' } })
    fireEvent.keyDown(input, { key: 'Enter', isComposing: true })
    expect(onSend).not.toHaveBeenCalled()
  })

  it('답변 생성 중에는 입력이 잠긴다', () => {
    render(<Composer busy onSend={() => {}} />)
    expect(screen.getByLabelText('질문 입력')).toBeDisabled()
  })
})

describe('Composer 음성 질문', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.doUnmock('../../speech/recorder')
  })

  it('마이크를 쓸 수 없는 브라우저에서는 마이크 버튼을 숨긴다', () => {
    render(<Composer busy={false} onSend={() => {}} />)
    expect(screen.queryByRole('button', { name: '음성으로 질문하기' })).not.toBeInTheDocument()
  })

  it('녹음을 끝내면 인식한 문장을 입력창에 채우고 보내지는 않는다', async () => {
    vi.resetModules()
    vi.doMock('../../speech/recorder', () => ({
      canRecord: () => true,
      startRecording: async () => ({
        stop: async () => ({ wav: new Blob(['x'], { type: 'audio/wav' }), seconds: 2 }),
        cancel: () => {},
      }),
    }))
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ isSuccess: true, code: '200', message: 'OK', result: { text: '요금제 바꾸고 싶어요' } }), { status: 200 })),
    )
    const { default: VoiceComposer } = await import('./Composer')
    const onSend = vi.fn()
    render(<VoiceComposer busy={false} onSend={onSend} />)
    fireEvent.click(screen.getByRole('button', { name: '음성으로 질문하기' }))
    fireEvent.click(await screen.findByRole('button', { name: '녹음 끝내기' }))
    expect(await screen.findByDisplayValue('요금제 바꾸고 싶어요')).toBeInTheDocument()
    expect(onSend).not.toHaveBeenCalled()
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/v1/chat/speech/transcriptions'), expect.objectContaining({ method: 'POST' }))
  })
})
