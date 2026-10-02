import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
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
